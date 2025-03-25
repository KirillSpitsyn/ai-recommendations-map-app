import { NextRequest, NextResponse } from 'next/server';
import { openaiClient } from '@/app/lib/openai';
import { GenerateLocationsRequest, GenerateLocationsResponse } from '@/app/types/api';

export async function POST(request: NextRequest) {
    try {
        // Parse the request body
        const body: GenerateLocationsRequest = await request.json();
        const { persona } = body;

        // Validate input
        if (!persona) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid request. Please provide a persona.',
                },
                { status: 400 }
            );
        }

        // Generate location recommendations using OpenAI instead of Google Maps
        const recommendedLocations = await openaiClient().generateLocationRecommendations(persona);

        // Handle case where no locations were found
        if (recommendedLocations.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'No suitable locations found. Please try a different X profile.',
                },
                { status: 404 }
            );
        }

        // Construct the response
        const response: GenerateLocationsResponse = {
            success: true,
            locations: recommendedLocations,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error generating locations:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to find recommended locations. Please try again later.',
            },
            { status: 500 }
        );
    }
}