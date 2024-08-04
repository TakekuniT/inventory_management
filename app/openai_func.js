"use client"
import * as dotenv from 'dotenv'
dotenv.config()

import { OpenAI} from 'openai';

import Groq from "groq-sdk";

// Initialize Groq with your API key
const groq = new Groq({ 
    apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
    dangerouslyAllowBrowser: true
 });

export async function getChatResponse(promptText) {
    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: promptText,
                },
            ],
            model: "llama3-8b-8192", // Make sure this model name is correct for Groq
        });

        return chatCompletion.choices[0]?.message?.content || "";
    } catch (error) {
        console.error("Error getting chat response:", error);
        return "An error occurred while processing the request.";
    }
}

//const openai = new OpenAI();
const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY, // Fallback API key
    dangerouslyAllowBrowser: true 
  });
/*
export async function getChatResponse(promptText) {
    const chatResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
            {
                role: "user",
                content: {
                    type: "text",
                    text: promptText,
                },
            },
        ],
    });

    return chatResponse.data.choices[0].message.content;
}*/



export async function identifyObjectFromCamera(imageData) {
    try {
        // Ensure imageData is in base64 format if coming from a camera
        // If not, convert it to base64 as needed
        const base64Image = imageData.toString('base64'); // Adjust if imageData is already base64

        // Create a completion request
        const imgResponse = await openai.chat.completions.create({
            model: 'gpt-4-vision-preview',
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Identify the primary object in the image in one word only",
                        },
                        {
                            type: "image",
                            data: base64Image, // Pass base64 encoded image
                        }
                    ],
                },
            ],
        });

        // Extract and return the result from the response
        const primaryObject = imgResponse.choices[0]?.message?.content?.text;
        console.log(primaryObject);
        return primaryObject || 'Object not identified';
    } catch (error) {
        console.error('Error identifying object:', error);
        throw error;
    }
}