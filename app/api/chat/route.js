import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import { Stream } from "openai/streaming";

const systemPrompt = `
You are a helpful and knowledgeable virtual assistant designed to help students find the best professors based on their specific needs and queries. Your role is to understand the student's requirements and provide them with the top 3 professor recommendations from the university database, using a Retrieval-Augmented Generation (RAG) system to ensure accurate and relevant results.

Guidelines:

1. **Understand the Query:**
   Carefully analyze the student's query to understand their specific requirements, such as subject, teaching style, rating, or any other criteria they mention.

2. **Retrieve Information:**
   Use the RAG system to retrieve relevant data about professors who match the student's criteria. Focus on finding professors who are highly rated and have good reviews in the relevant subject area.

3. **Rank the Professors:**
   Rank the professors based on their relevance to the query, ratings, and reviews. Ensure the top 3 recommendations are those most likely to meet the student's needs.

4. **Provide Recommendations:**
   Present the top 3 professors in a concise and informative manner. Include the professor's name, subject, average rating, and a brief summary of their reviews to help the student make an informed decision.

5. **Offer Additional Assistance:**
   If the student requires further help, such as finding professors for different subjects or more detailed information, be ready to assist with additional queries.

Example Interaction:

**Student Question:** "I'm looking for a great Calculus professor who is known for clear explanations and has at least a 4.5-star rating."

**Your Response:**
1. **Dr. Emily Johnson** - **Subject:** Calculus I  
   **Rating:** 4.8  
   **Review Summary:** Dr. Johnson is praised for her clear and concise explanations, making complex topics easy to understand. Students appreciate her engaging teaching style and willingness to help outside of class.

2. **Dr. Michael Brown** - **Subject:** Calculus II  
   **Rating:** 4.7  
   **Review Summary:** Known for his structured lectures and detailed notes, Dr. Brown ensures that students grasp the fundamentals of Calculus. His approachable nature makes him a favorite among students.

3. **Dr. Susan Lee** - **Subject:** Advanced Calculus  
   **Rating:** 4.6  
   **Review Summary:** Dr. Lee is highly regarded for her deep understanding of the subject and her ability to break down difficult concepts. Her passion for Calculus is evident in her teaching.
`;


export async function POST(req) {
    const data = await req.json();
    
    if (!Array.isArray(data) || data.length === 0) {
        return NextResponse.json({ error: 'No data provided or data is not an array' }, { status: 400 });
    }
    
    const pc = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
    });
    const index = pc.index('bag').namespace('ns1');
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY, 
    });

    const text = data[data.length - 1].content;

    if (!text) {
        return NextResponse.json({ error: 'Content is missing in the last message' }, { status: 400 });
    }

    const embedding = await openai.embeddings.create({
        model: 'text-embedding-ada-002', 
        input: text,
    });

    const results = await index.query({
        topK: 3, 
        includeMetadata: true,
        vector: embedding.data[0].embedding,
    });

    let resultString = '\n\nBased on your request, here is what I have found: ';
    results.matches.forEach((match) => {
        resultString += `\n
        Professor: ${match.id}
        Review: ${match.metadata.review}
        Subject: ${match.metadata.subject}
        Stars: ${match.metadata.stars}
        \n\n`
    });

    const lastMessage = data[data.length - 1];
    const lastMessageContent = lastMessage.content + resultString;
    const lastDataWithoutLastMessage = data.slice(0, data.length - 1);

    const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
            { role: 'system', content: systemPrompt },
            ...lastDataWithoutLastMessage,
            { role: 'user', content: lastMessageContent },
        ],
        stream: true,
    });

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            try {
                for await (const chunk of completion) {
                    const content = chunk.choices[0]?.delta?.content;
                    if (content) {
                        const text = encoder.encode(content);
                        controller.enqueue(text);
                    }
                }
            } catch (err) {
                controller.error(err);
            } finally {
                controller.close();
            }
        },
    });

    return new NextResponse(stream);
}