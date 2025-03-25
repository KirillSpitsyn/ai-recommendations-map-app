import { NextRequest, NextResponse } from 'next/server';
import { exaClient } from '@/app/lib/exa';
import { openaiClient } from '@/app/lib/openai';
import { GeneratePersonaRequest, GeneratePersonaResponse } from '@/app/types/api';

export async function POST(request: NextRequest) {
    try {
        // Parse the request body
        const body: GeneratePersonaRequest = await request.json();
        const { xHandle } = body;

        // Validate input
        if (!xHandle) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid X handle. Please provide a valid X username.',
                },
                { status: 400 }
            );
        }

        // Clean handle (remove @ if present)
        const cleanHandle = xHandle.replace(/^@/, '');

        try {
            // Step 1: Search for X profile data using Exa
            const searchResult = await exaClient().searchXProfile(cleanHandle);

            // Step 2: Extract relevant information
            const profileInfo = exaClient().extractProfileInfo(searchResult);

            // Handle case where no profile data was found
            if (!profileInfo || !profileInfo.tweets || profileInfo.tweets.length === 0) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Could not find X profile data. Please check the handle and try again.',
                    },
                    { status: 404 }
                );
            }

            try {
                // Step 3: Generate persona using OpenAI
                const personaData = await openaiClient().generatePersona({
                    recentTweets: profileInfo.tweets,
                    bio: profileInfo.bio || '',
                });

                // Construct the response
                const response: GeneratePersonaResponse = {
                    success: true,
                    persona: {
                        ...personaData,
                        profileImageUrl: profileInfo.profileImageUrl,
                    },
                };

                return NextResponse.json(response);
            } catch (openaiError) {
                console.error('OpenAI error:', openaiError);
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Failed to generate persona from the X data. Please try again later.',
                    },
                    { status: 500 }
                );
            }
        } catch (exaError) {
            console.error('Exa error:', exaError);
            return NextResponse.json(
                {
                    success: false,
                    error: 'Failed to fetch X profile data. Please check the handle and try again.',
                },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('General error generating persona:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to process your request. Please try again later.',
            },
            { status: 500 }
        );
    }
}