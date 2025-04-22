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
                timeout: 25000, // 25 second timeout (allowing 5 seconds for processing on our side)
            });
        }

        return this.client;
    }

    /**
     * Creates an optimized system prompt for persona generation
     * @returns Engineered system prompt
     */
    private createPersonaSystemPrompt(): string {
        return `
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
        "name": "Their name from the data provided (IMPORTANT: Do NOT use 'Unknown User' - if you can't determine the full name, use their handle name with proper capitalization)",
        "handle": "Their X handle (without the @ symbol)",
        "bio": "A concise 1-2 sentence description of who they are",
        "traits": ["trait1", "trait2", "trait3", "trait4", "trait5"],
        "interests": ["interest1", "interest2", "interest3", "interest4", "interest5"]
      }
      
      The traits should represent personality characteristics, communication style, and values.
      The interests should be specific topics, activities, or areas they seem interested in.
      Be specific and precise in your analysis. Base your assessment purely on the provided data.
      
      If there isn't enough information to determine specific traits or interests, make educated guesses
      based on the limited information available, but keep them reasonable and grounded.
    `;
    }

    /**
     * Creates a user prompt for persona generation based on context
     * @param context X profile data to use as context
     * @returns Engineered user prompt
     */
    private createPersonaUserPrompt(context: PersonaGenerationContext): string {
        const { recentTweets, bio, profileDescription, handle } = context;

        // Extract handle from context to use for fallback name
        const userHandle = handle || '';

        // Create a bullet point list of tweets for the prompt
        const tweetList = recentTweets
            .slice(0, 22) // Limit to 22 tweets to control token usage
            .map(tweet => `• ${tweet}`)
            .join('\n');

        return `
      Here's information from an X (Twitter) user's profile:
      
      Handle: ${userHandle}
      ${bio ? `Bio: ${bio}\n\n` : ''}
      ${profileDescription ? `Profile description: ${profileDescription}\n\n` : ''}
      
      Recent posts:
      ${tweetList}
      
      Based on this information, create a persona for this user following the format in your instructions.
      Focus especially on traits and interests that might influence what locations they would enjoy visiting.
      
      IMPORTANT: If you can't determine the person's full name, use their handle name (${userHandle}) 
      with proper capitalization instead. DO NOT use "Unknown User" as the name.
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

            // Extract handle from context for fallback
            const handle = context.handle || '';

            // Get optimized prompts
            const systemPrompt = this.createPersonaSystemPrompt();
            const userPrompt = this.createPersonaUserPrompt({
                ...context,
                handle: handle,
            });

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

            // Validate response structure
            if (!personaData.name || !personaData.traits || !personaData.interests) {
                throw new Error('Failed to generate persona: Invalid response format');
            }

            // Ensure we never return "Unknown User" as the name
            if (personaData.name === 'Unknown User') {
                personaData.name = handle.charAt(0).toUpperCase() + handle.slice(1);
            }

            // Always use the requested handle
            personaData.handle = handle;

            return personaData;
        } catch (error: any) {
            console.error('Error generating persona:', error);
            
            // Check if it's a timeout error
            if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT' || 
                (error.message && error.message.includes('timeout'))) {
                throw new Error('Request timed out. Please try again later.');
            }
            
            throw new Error('Failed to generate persona');
        }
    }
    
    /**
     * Creates an optimized system prompt for location recommendations
     * @returns Engineered system prompt for locations
     */
    private createLocationSystemPrompt(): string {
        return `
        You are a Toronto local expert and guide. Your task is to recommend specific, real places in Toronto 
        that would appeal to a person based on their interests and personality traits.
        
        IMPORTANT RULES:
        1. ONLY recommend real, popular, and well-known locations in Toronto.
        2. Each location MUST be unique - no duplicates by name or address.
        3. Verify that each business/place actually exists.
        4. Only recommend from these categories: restaurants, shops, attractions, parks, and entertainment venues.
        5. For all personas, diversify recommendations (e.g., recommend a park or museum instead of only tech spots for tech people).
        6. Include the OFFICIAL website URL for each location - NOT Google Maps links.
        7. Only include website URLs if they are actual business websites. If you don't know the real website, omit the website field.
        8. Provide reasonably accurate geographic coordinates within Toronto.
        9. Give EXACTLY 5 different locations - not 4, not 6.
        10. If multiple similar locations exist at the same address, only include ONE of them.
        
        Format your response as a JSON object with this exact structure:
        {
          "name": "Location Name",
          "address": "Exact Toronto address",
          "description": "Why this matches the persona (2-3 sentences)",
          "category": "One of: restaurant, shop, attraction, park, entertainment",
          "coordinates": {"lat": 43.xxxx, "lng": -79.xxxx},
          "rating": 4.x, 
          "website": "https://real-official-website.com" (ONLY include if you know the real website)
        }
        `;
    }
    
    /**
     * Generate location recommendations in Toronto based on persona
     * @param persona The persona to generate recommendations for
     * @returns Array of recommended locations
     */
    async generateLocationRecommendations(persona: OpenAIPersonaResponse): Promise<Location[]> {
        // Initialize client when method is called
        const client = this.initializeClient();
        
        // Create a batch request for all 5 locations at once to ensure proper deduplication
        const systemPrompt = this.createLocationSystemPrompt();
        
        // Create a user prompt that emphasizes the need for 5 unique locations
        const userPrompt = `
        Based on this persona, recommend EXACTLY 5 specific locations in Toronto that would appeal to them:
        
        Name: ${persona.name}
        Bio: ${persona.bio}
        Traits: ${persona.traits.join(', ')}
        Interests: ${persona.interests.join(', ')}
        
        YOUR RECOMMENDATIONS MUST:
        - Include EXACTLY 5 unique locations (not 4, not 6)
        - Have no duplicates (by name or address)
        - Be real, popular places that actually exist in Toronto
        - Be from different categories (restaurant, shop, attraction, park, entertainment)
        - Include website URLs for this location
        - Be well-known and popular spots
        - If this is a tech persona, include diverse recommendations beyond tech (parks, museums, etc.)
        
        Return as a JSON array with 5 location objects following the format in your instructions.
        `;
        
        try {
            // Make the API call
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
                throw new Error('Failed to generate locations: Empty response from OpenAI');
            }
            
            // Parse the JSON response
            const parsedContent = JSON.parse(content);
            
            // Handle different response formats (array or object with locations property)
            let locationData: any[] = [];
            if (Array.isArray(parsedContent)) {
                locationData = parsedContent;
            } else if (parsedContent.locations && Array.isArray(parsedContent.locations)) {
                locationData = parsedContent.locations;
            } else {
                // Try to find any array property in the response
                const arrayProperties = Object.keys(parsedContent).filter(key => 
                    Array.isArray(parsedContent[key]) && parsedContent[key].length > 0
                );
                
                if (arrayProperties.length > 0) {
                    locationData = parsedContent[arrayProperties[0]];
                } else {
                    throw new Error('Invalid location data format returned');
                }
            }
            
            // Validate we have 5 locations
            if (locationData.length < 5) {
                console.warn(`Only received ${locationData.length} locations, making additional request for the missing locations`);
                
                // Make another request to get additional locations
                const additionalResponse = await client.chat.completions.create({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: `
                            Based on this persona, recommend ${5 - locationData.length} MORE specific locations in Toronto 
                            that would appeal to them, different from these locations:
                            ${locationData.map(loc => loc.name).join(', ')}
                            
                            Name: ${persona.name}
                            Bio: ${persona.bio}
                            Traits: ${persona.traits.join(', ')}
                            Interests: ${persona.interests.join(', ')}
                            
                            Follow the same format as before.
                        `}
                    ],
                    temperature: 0.7,
                    response_format: { type: 'json_object' },
                });
                
                const additionalContent = additionalResponse.choices[0]?.message?.content;
                
                if (additionalContent) {
                    const additionalData = JSON.parse(additionalContent);
                    let additionalLocations: any[] = [];
                    
                    if (Array.isArray(additionalData)) {
                        additionalLocations = additionalData;
                    } else if (additionalData.locations && Array.isArray(additionalData.locations)) {
                        additionalLocations = additionalData.locations;
                    }
                    
                    // Add the new locations to our existing ones
                    locationData = [...locationData, ...additionalLocations];
                }
            }
            
            // Deduplicate locations by name and address
            const seenNames = new Set<string>();
            const seenAddresses = new Set<string>();
            const uniqueLocations: any[] = [];
            
            for (const location of locationData) {
                const normalizedName = location.name.toLowerCase().trim();
                const normalizedAddress = location.address.toLowerCase().trim();
                
                // Skip if we've seen this name or address
                if (seenNames.has(normalizedName) || seenAddresses.has(normalizedAddress)) {
                    continue;
                }
                
                seenNames.add(normalizedName);
                seenAddresses.add(normalizedAddress);
                uniqueLocations.push(location);
                
                // Once we have 5 unique locations, we're done
                if (uniqueLocations.length >= 5) {
                    break;
                }
            }
            
            // If we still don't have 5 locations, make one last attempt
            if (uniqueLocations.length < 5) {
                console.warn(`After deduplication, only have ${uniqueLocations.length} locations. Making final request.`);
                
                const finalResponse = await client.chat.completions.create({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: `
                            I need EXACTLY ${5 - uniqueLocations.length} MORE unique locations in Toronto for this persona,
                            completely different from these locations you already provided:
                            ${uniqueLocations.map(loc => `${loc.name} at ${loc.address}`).join(', ')}
                            
                            Name: ${persona.name}
                            Bio: ${persona.bio}
                            Traits: ${persona.traits.join(', ')}
                            Interests: ${persona.interests.join(', ')}
                            
                            Make sure these are real, popular places that actually exist.
                        `}
                    ],
                    temperature: 0.8, // Slightly higher temperature for diversity
                    response_format: { type: 'json_object' },
                });
                
                const finalContent = finalResponse.choices[0]?.message?.content;
                
                if (finalContent) {
                    const finalData = JSON.parse(finalContent);
                    let finalLocations: any[] = [];
                    
                    if (Array.isArray(finalData)) {
                        finalLocations = finalData;
                    } else if (finalData.locations && Array.isArray(finalData.locations)) {
                        finalLocations = finalData.locations;
                    } else {
                        // Try to find any array in the response
                        const arrayProps = Object.keys(finalData).filter(key => 
                            Array.isArray(finalData[key]) && finalData[key].length > 0
                        );
                        
                        if (arrayProps.length > 0) {
                            finalLocations = finalData[arrayProps[0]];
                        }
                    }
                    
                    // Add new unique locations
                    for (const location of finalLocations) {
                        const normalizedName = location.name.toLowerCase().trim();
                        const normalizedAddress = location.address.toLowerCase().trim();
                        
                        if (!seenNames.has(normalizedName) && !seenAddresses.has(normalizedAddress)) {
                            seenNames.add(normalizedName);
                            seenAddresses.add(normalizedAddress);
                            uniqueLocations.push(location);
                            
                            if (uniqueLocations.length >= 5) {
                                break;
                            }
                        }
                    }
                }
            }
            
            // Convert to our Location format and add IDs
            const locations: Location[] = uniqueLocations.slice(0, 5).map(location => {
                // Only include website if it's a real website (not a Google Maps link)
                let website = location.website;
                if (website && (
                    website.includes('google.com/maps') || 
                    !website.startsWith('http') || 
                    !website.includes('.')
                )) {
                    website = undefined; // Don't include invalid websites or Google Maps links
                }
                
                return {
                    id: uuidv4(),
                    name: location.name,
                    address: location.address,
                    description: location.description,
                    category: location.category || 'attraction',
                    coordinates: location.coordinates || { lat: 43.6532, lng: -79.3832 }, // Default to Toronto center if missing
                    rating: location.rating || 4.0,
                    website: website,
                };
            });
            
            // If we STILL don't have 5 locations, add generic ones
            if (locations.length < 5) {
                const defaultLocations = [
                    {
                        id: uuidv4(),
                        name: "CN Tower",
                        address: "290 Bremner Blvd, Toronto, ON M5V 3L9",
                        description: "Toronto's iconic landmark with breathtaking views of the city.",
                        category: "attraction",
                        coordinates: { lat: 43.6426, lng: -79.3871 },
                        rating: 4.7,
                        website: "https://www.cntower.ca/"
                    },
                    {
                        id: uuidv4(),
                        name: "St. Lawrence Market",
                        address: "93 Front St E, Toronto, ON M5E 1C3",
                        description: "Historic market with fresh food and unique vendors.",
                        category: "shop",
                        coordinates: { lat: 43.6489, lng: -79.3714 },
                        rating: 4.6,
                        website: "https://www.stlawrencemarket.com/"
                    },
                    {
                        id: uuidv4(),
                        name: "High Park",
                        address: "1873 Bloor St W, Toronto, ON M6R 2Z3",
                        description: "Toronto's largest public park with trails, gardens and a zoo.",
                        category: "park",
                        coordinates: { lat: 43.6465, lng: -79.4637 },
                        rating: 4.8,
                        website: "https://www.toronto.ca/explore-enjoy/parks-gardens-beaches/gardens-and-horticulture/gardens-and-parks/high-park/"
                    },
                    {
                        id: uuidv4(),
                        name: "Royal Ontario Museum",
                        address: "100 Queens Park, Toronto, ON M5S 2C6",
                        description: "World-class museum with art, culture & natural history.",
                        category: "attraction",
                        coordinates: { lat: 43.6677, lng: -79.3948 },
                        rating: 4.6,
                        website: "https://www.rom.on.ca/"
                    },
                    {
                        id: uuidv4(),
                        name: "Distillery District",
                        address: "55 Mill St, Toronto, ON M5A 3C4",
                        description: "Historic district with shops, restaurants and galleries.",
                        category: "entertainment",
                        coordinates: { lat: 43.6503, lng: -79.3596 },
                        rating: 4.5,
                        website: "https://www.thedistillerydistrict.com/"
                    }
                ];
                
                // Add default locations to fill up to 5
                for (let i = 0; i < defaultLocations.length && locations.length < 5; i++) {
                    locations.push(defaultLocations[i]);
                }
            }
            
            return locations;
        } catch (error: any) {
            console.error('Error generating location recommendations:', error);
            
            // Check if it's a timeout error
            if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT' || 
                (error.message && error.message.includes('timeout'))) {
                throw new Error('Request timed out. Please try again later.');
            }
            
            throw new Error('Failed to generate location recommendations');
        }
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
