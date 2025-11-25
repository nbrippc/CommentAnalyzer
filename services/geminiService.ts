
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import type { AnalysisResult } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    themes: {
      type: Type.ARRAY,
      description: "A list of key themes identified from the comments.",
      items: {
        type: Type.OBJECT,
        properties: {
          theme: {
            type: Type.STRING,
            description: "The name of the theme.",
          },
          sentiment: {
            type: Type.OBJECT,
            description: "The count of comments for each sentiment type within this theme.",
            properties: {
              positive: { type: Type.INTEGER, description: "Count of positive comments." },
              neutral: { type: Type.INTEGER, description: "Count of neutral comments." },
              negative: { type: Type.INTEGER, description: "Count of negative comments." },
              mixed: { type: Type.INTEGER, description: "Count of comments with mixed sentiment." },
            },
            required: ["positive", "neutral", "negative", "mixed"]
          },
        },
        required: ["theme", "sentiment"],
      },
    },
    insights: {
      type: Type.ARRAY,
      description: "A list of the top 3-5 actionable business insights derived from the themes.",
      items: {
        type: Type.OBJECT,
        properties: {
          insight: {
            type: Type.STRING,
            description: "A concise, actionable business insight.",
          },
          recommendation: {
            type: Type.STRING,
            description: "A concrete recommendation for improvement based on the insight.",
          },
          quotes: {
            type: Type.ARRAY,
            description: "A list of 2-3 direct quotes or expressions from the comments that serve as evidence for this insight.",
            items: {
                type: Type.STRING,
                description: "A direct quote from the survey text."
            }
          },
          relatedTheme: {
            type: Type.STRING,
            description: "The specific Theme Name or Category Name this insight is most closely related to."
          }
        },
        required: ["insight", "recommendation", "quotes", "relatedTheme"],
      },
    },
    comments: {
      type: Type.ARRAY,
      description: "A list of every input comment, categorized by theme and sentiment.",
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING, description: "The exact text of the comment." },
          theme: { type: Type.STRING, description: "The theme assigned to this comment." },
          sentiment: { 
            type: Type.STRING, 
            enum: ["positive", "neutral", "negative", "mixed"],
            description: "The sentiment classification of the comment."
          }
        },
        required: ["text", "theme", "sentiment"]
      }
    }
  },
  required: ["themes", "insights", "comments"],
};


export async function analyzeSurveyComments(comments: string, surveyQuestion?: string, signal?: AbortSignal, analysisType: 'both' | 'theme-only' | 'sentiment-only' = 'both'): Promise<Omit<AnalysisResult, 'surveyQuestion'>> {
  const questionContext = surveyQuestion 
    ? `The comments were in response to the following question or topic: "${surveyQuestion}"`
    : '';
  
  let instructionSteps = `
    1.  Identify the main themes present in the comments. Group the comments into 4 to 8 distinct themes. Avoid generic themes like "Other" or "General". Try to ensure each theme has at least 10 comments; merge smaller, related themes if necessary.
    2.  For each theme, categorize the sentiment of the related comments. You must count the number of comments that are 'positive', 'neutral', 'negative', and 'mixed'.
    3.  Based on your thematic analysis, derive the top 3 to 5 most critical, actionable business insights. An insight is a deep understanding of the situation that can inform business decisions.
    4.  Populate the 'comments' list by assigning EVERY input comment to its most relevant theme and determining its sentiment ('positive', 'neutral', 'negative', or 'mixed').
  `;

  if (analysisType === 'theme-only') {
    instructionSteps = `
    1.  Identify the main themes present in the comments. Group the comments into 4 to 8 distinct themes. Avoid generic themes like "Other" or "General". Try to ensure each theme has at least 10 comments; merge smaller, related themes if necessary.
    2.  For each theme, count the number of related comments. Since sentiment analysis is NOT required, assign the TOTAL count of comments for the theme to the 'neutral' category. Set 'positive', 'negative', and 'mixed' counts to 0.
    3.  Based on the identified themes, derive the top 3 to 5 most critical, actionable business insights.
    4.  Populate the 'comments' list by assigning EVERY input comment to its most relevant theme. Set the sentiment for all comments to 'neutral'.
    `;
  }

  if (analysisType === 'sentiment-only') {
    instructionSteps = `
    1.  Categorize all comments into exactly four broad groups based SOLELY on their sentiment: "Positive Feedback", "Negative Feedback", "Neutral Feedback", and "Mixed Feedback". Treat these four groups as your 'themes'.
    2.  For the 'Positive Feedback' theme, assign the count of positive comments to 'positive' (set others to 0).
        For the 'Negative Feedback' theme, assign the count of negative comments to 'negative' (set others to 0).
        For the 'Neutral Feedback' theme, assign the count of neutral comments to 'neutral' (set others to 0).
        For the 'Mixed Feedback' theme, assign the count of mixed comments to 'mixed' (set others to 0).
    3.  Based on these sentiment drivers, derive the top 3 to 5 most critical, actionable business insights focusing on what is driving the positive or negative sentiment.
    4.  Populate the 'comments' list by assigning EVERY input comment to one of the four sentiment themes. Set the sentiment value ('positive', 'negative', 'neutral', 'mixed') to match the theme.
    `;
  }

  const prompt = `
    You are an expert business analyst specializing in synthesizing customer and employee feedback.
    Analyze the following raw, open-ended survey comments. The comments are separated by newlines.
    ${questionContext}

    Your task is to:
    ${instructionSteps}
    5.  For each insight, provide a clear and concrete recommendation for improvement.
    6.  For each insight, extract 2-3 verbatim quotes or representative phrases from the text that provide evidence for the insight.
    7.  For each insight, assign a specific 'relatedTheme' (or Category Name) that the insight best belongs to.

    Return your complete analysis as a single JSON object. Do not include any explanatory text before or after the JSON object.

    Survey Comments:
    ---
    ${comments}
    ---
  `;

  const requestPromise = ai.models.generateContent({
    model: "gemini-2.5-pro",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: analysisSchema,
      temperature: 0.2,
    },
  });

  let response: GenerateContentResponse;

  if (signal) {
    if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
    }
    // Race the request against the abort signal
    response = await Promise.race([
        requestPromise,
        new Promise<never>((_, reject) => {
            signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        })
    ]);
  } else {
    response = await requestPromise;
  }

  try {
    const jsonText = response.text.trim();
    const result: AnalysisResult = JSON.parse(jsonText);
    return { ...result, analysisType };
  } catch (e) {
    console.error("Failed to parse Gemini response:", response.text);
    throw new Error("Invalid JSON response from the API.");
  }
}
