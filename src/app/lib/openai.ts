import OpenAI from 'openai';
import { OpenAIPersonaResponse } from '../types/api';
import { PersonaGenerationContext } from '../types/persona';
import { Location } from '../types/location';
import { v4 as uuidv4 } from 'uuid';

/**
 * Enhanced Client for interacting with OpenAI API with integrated prompt engineering
 */
export class OpenAIClient {
    private client: OpenAI | null = null;
    private apiKey: string | undefined;

    constructor(apiKey?: string) {
        // Store the API key but don't initialize the client yet
        this.apiKey = apiKey || process.env.OPENAI_API_KEY;
    }

    // Initialize the client only when needed
    private initializeClient() {
        if (!this.client) {
            if (!this.apiKey) {
                throw new Error('OpenAI API key is required');
            }

            this.client = new OpenAI({
                apiKey: this.apiKey,
            });
        }

        return this.client;
    }

    /**
     * Creates a user prompt for persona generation based on context
     * @param context X profile data to use as context
     * @returns Engineered user prompt
     */
    private createPersonaUserPrompt(context: PersonaGenerationContext): string {
        const { recentTweets, bio, profileDescription } = context;

        // Create a bullet point list of tweets for the prompt
        const tweetList = recentTweets
            .slice(0, 22) // Limit to 22 tweets to control token usage
            .map(tweet => `• ${tweet}`)
            .join('\n');

        return `
      Here's information from an X (Twitter) user's profile:
      
      ${bio ? `Bio: ${bio}\n\n` : ''}
      ${profileDescription ? `Profile description: ${profileDescription}\n\n` : ''}
      
      Recent posts:
      ${tweetList}
      
      Based on this information, create a persona for this user following the format in your instructions.
      Focus especially on traits and interests that might influence what locations they would enjoy visiting.
    `;
    }

    /**
     * Generate a structured persona based on X profile data
     * @param context X profile data to use as context
     * @returns Generated persona
     */
    async generatePersona(context: PersonaGenerationContext): Promise<OpenAIPersonaResponse> {
        try {
            // Initialize client when method is called
            const client = this.initializeClient();

            // Get optimized prompts
            const systemPrompt = `
              You are an expert at understanding people based on their social media presence.
              Your task is to create a detailed persona based on someone's X (formerly Twitter) posts and bio.
              Analyze the content, style, interests, and values expressed in their posts to build this persona.
              
              Focus on identifying:
              1. Personality traits (e.g., analytical, creative, empathetic)
              2. Communication style (e.g., direct, humorous, formal)
              3. Values and beliefs (e.g., values authenticity, environmental consciousness)
              4. Interests and activities (e.g., technology, cooking, hiking)
              5. Lifestyle indicators (e.g., urban professional, outdoor enthusiast)
              
              Return a JSON object with the following structure:
              {
                "name": "Their actual name from the data (NEVER use 'Unknown User')",
                "handle": "Their X handle (without the @ symbol)",
                "bio": "A concise 1-2 sentence description of who they are",
                "traits": ["trait1", "trait2", "trait3", "trait4", "trait5"],
                "interests": ["interest1", "interest2", "interest3", "interest4", "interest5"]
              }
              
              The traits should represent personality characteristics, communication style, and values.
              The interests should be specific topics, activities, or areas they seem interested in.
              Be specific and precise in your analysis. Base your assessment purely on the provided data.
              
              Do NOT use generic placeholder names like "Unknown User". If you can't determine their actual name,
              use their handle as their name without the @ symbol.
            `;
            
            const userPrompt = this.createPersonaUserPrompt(context);

            // Call OpenAI API
            const response = await client.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                response_format: { type: 'json_object' },
            });

            // Parse response from OpenAI
            const content = response.choices[0]?.message?.content;

            if (!content) {
                throw new Error('Failed to generate persona: Empty response from OpenAI');
            }

            // Parse the JSON response
            const personaData = JSON.parse(content) as OpenAIPersonaResponse;

            // Fallback if name is still "Unknown User" or empty
            if (!personaData.name || personaData.name === 'Unknown User') {
                personaData.name = personaData.handle;
            }

            // Validate response structure
            if (!personaData.traits || !personaData.interests) {
                throw new Error('Failed to generate persona: Invalid response format');
            }

            return personaData;
        } catch (error) {
            console.error('Error generating persona:', error);
            throw new Error('Failed to generate persona');
        }
    }

    /**
     * Generate location recommendations in Toronto based on persona
     * @param persona The persona to generate recommendations for
     * @returns Array of recommended locations
     */
    async generateLocationRecommendations(persona: OpenAIPersonaResponse): Promise<Location[]> {
        // Initialize client when method is called
        const client = this.initializeClient();
        
        // Create individual location recommendations in separate API calls
        const recommendationPromises = [];
        const categories = ['restaurant', 'cafe', 'entertainment venue', 'cultural attraction', 'outdoor space'];
        
        for (let i = 0; i < 5; i++) {
            // Create a prompt for a single location recommendation with BRIEF descriptions
            const category = categories[i];
            const prompt = `Based on this persona, recommend ONE specific ${category} in Toronto:
            
            Name: ${persona.name}
            Bio: ${persona.bio}
            Traits: ${persona.traits.join(', ')}
            Interests: ${persona.interests.join(', ')}
            
            Return ONLY ONE location recommendation as a JSON object with these fields:
            - name: The location name (must be a real Toronto location)
            - address: Full Toronto address
            - description: Why this place fits the persona (KEEP THIS VERY BRIEF - 1-2 SHORT sentences only!)
            - category: "${category}"
            - coordinates: Object with lat and lng (realistic Toronto coordinates)
            - rating: Numeric rating (1-5)`;
            
            recommendationPromises.push(
                client.chat.completions.create({
                    model: 'gpt-4o',
                    messages: [
                        { 
                            role: 'system', 
                            content: `You are a Toronto local expert. Recommend a SPECIFIC ${category} in Toronto that matches this persona. Keep descriptions extremely brief - 1-2 short sentences maximum.` 
                        },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.5,
                    response_format: { type: 'json_object' },
                })
            );
        }
        
        // Wait for all recommendations to come back
        const responses = await Promise.all(recommendationPromises);
        
        // Process each response
        const locations: Location[] = [];
        
        for (let i = 0; i < responses.length; i++) {
            const response = responses[i];
            const content = response.choices[0]?.message?.content;
            
            if (content) {
                try {
                    const locationData = JSON.parse(content as string);
                    locations.push({
                        id: uuidv4(),
                        name: locationData.name,
                        address: locationData.address,
                        description: locationData.description,
                        category: locationData.category || categories[i],
                        coordinates: locationData.coordinates,
                        rating: locationData.rating
                    });
                } catch (error) {
                    console.error(`Error processing location ${i}:`, error);
                }
            }
        }
        
        // Remove any duplicates by name
        const uniqueLocations = locations.filter((location, index, self) =>
            index === self.findIndex((l) => l.name === location.name)
        );
        
        // If we didn't get any locations, throw an error
        if (uniqueLocations.length === 0) {
            throw new Error('Failed to generate any location recommendations');
        }
        
        return uniqueLocations;
    }
}

// Export a factory function for creating instances
export const createOpenAIClient = (apiKey?: string) => new OpenAIClient(apiKey);

// Lazy-loaded singleton instance - only created when used
let clientInstance: OpenAIClient | null = null;
export const openaiClient = () => {
    if (!clientInstance) {
        clientInstance = new OpenAIClient();
    }
    return clientInstance;
};
