import {
  GoogleGenerativeAI,
} from '@google/generative-ai';
import type { Part } from "@google/generative-ai"

// For security, it's best practice to use environment variables for your API key.
// Avoid hardcoding keys directly in your source code.
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY as string);

export async function Run_ai(image: string, prompt: string, HTMLelements: Array<any>): Promise<string> {
  // The API expects only the raw Base64 data, without the 'data:image/png;base64,' prefix.
  const base64Data = image.split(',').pop() || '';

  console.log(base64Data)
  const promptParts: Part[] = [
    {
      inlineData: {
        mimeType: 'image/png',
        data: base64Data,
      },
    },
    {
      text: `Here is the array of relevant HTML elements on the page: ${JSON.stringify(HTMLelements, null, 2)}`
    },
    {
      text: `User Prompt: "${prompt}"`
    },
  ];


  const build = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: `
Primary Call-to-Action Button
1. General Styling:
Target Element: button.cta-primary
Action: Modify CSS properties.
Instructions:
Set the background-color to a high-contrast color, for example, #007BFF (a vibrant blue).
Set the text color to #FFFFFF (white).
Increase the font-size to 18px.
Apply a font-weight of 700 (bold).
Add padding of 15px top and bottom, and 30px left and right.
Set the border to none.
Apply a border-radius of 8px to create slightly rounded corners.
Set the cursor to pointer.
Add a subtle box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1).
2. Hover State:
Target Element: button.cta-primary:hover
Action: Modify CSS properties for the hover pseudo-class.
Instructions:
Slightly darken the background-color to #0056b3 to provide visual feedback on mouseover.
Elevate the button slightly by adjusting the box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15).
Use the transform property to move the button up slightly: transform: translateY(-2px).
3. Transition:
Target Element: button.cta-primary
Action: Add a CSS transition property.
Instructions:
Apply a transition to the background-color, box-shadow, and transform properties with a duration of 0.3s and an ease-in-out timing function. This ensures a smooth animation on hover.
`
  });


  const buildPrompt = await build.generateContentStream(promptParts);

  let buildFinal = '';
  for await (const chunk of buildPrompt.stream) {
    const chunkText = chunk.text();
    buildFinal += chunkText;
  }
  const newParts: Part[] = [
    {
      inlineData: {
        mimeType: 'image/png',
        data: base64Data,
      },
    },
    {
      text: `Here is the array of relevant HTML elements on the page: ${JSON.stringify(HTMLelements, null, 2)}`
    },
    {
      text: `User Prompt: "${buildFinal}"`
    },
  ];


  console.log("buildPrompt", buildFinal)


  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: `
You are an expert web assistant specialized in modifying HTML elements based on user input.
Your task is to analyze the provided image, the user's modification request, and the array of HTML elements.
Follow these rules strictly:

1. Identify the element that visually matches the image with highest accuracy.
2. Apply the user's prompt exactly as requested: modify, create, or style the element accordingly.
3. Preserve the original className and any existing identifiers; do not remove or rename them.
4. Output ONLY a JSON object with exactly two keys:
   - "identifier": the original className of the selected element.
   - "modifiedHtml": the full HTML string of the modified element.
5. Do NOT include explanations, markdown, comments, or any extra characters.
6. If creating a new element, generate a unique className and return it as "identifier".
7. Make sure the modified HTML is valid, properly nested, and includes all requested changes.

Always respond in a clean JSON format that can be parsed directly by scripts.
`
  })
  const result = await model.generateContentStream(newParts);

  let finalResponse = '';
  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    finalResponse += chunkText;
  }

  console.log('--- Final Modified Element ---');
  console.log(finalResponse);
  return finalResponse;
}

