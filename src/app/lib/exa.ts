import axios from 'axios';
import { ExaSearchResult, ExaResult } from '../types/api';

/**
 * Client for interacting with the Exa API
 */
export class ExaClient {
    private readonly apiKey: string | undefined;
    private readonly baseUrl: string = 'https://api.exa.ai/search';

    constructor(apiKey?: string) {
        // Store API key but don't validate at construction time
        this.apiKey = apiKey || process.env.EXA_API_KEY;
    }

    /**
     * Validate that the API key is available
     */
    private validateApiKey() {
        if (!this.apiKey) {
            throw new Error('Exa API key is required');
        }
    }

    /**
     * Search for content related to an X handle
     * @param xHandle The X (Twitter) handle to search for
     * @returns Search results from Exa
     */
    async searchXProfile(xHandle: string): Promise<ExaSearchResult> {
        try {
            // Validate API key when method is called
            this.validateApiKey();

            // Clean handle (remove @ if present)
            const cleanHandle = xHandle.replace(/^@/, '');

            // Construct search query - look for recent content from this user
            const query = `site:twitter.com @${cleanHandle} OR from:${cleanHandle}`;

            // Log the request before sending it
            console.log('Sending request to Exa API:', {
                query,
                num_results: 22,
                use_autoprompt: true,
                include_domains: ['twitter.com', 'x.com'],
                highlights: true,
                text_search_strategy: 'keyword',
            });

            // Make request to Exa API
            const response = await axios.post(
                this.baseUrl,
                {
                    query,
                    num_results: 22,
                    use_autoprompt: true,
                    include_domains: ['twitter.com', 'x.com'],
                    highlights: true,
                    text_search_strategy: 'keyword',
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': this.apiKey,
                    },
                }
            );
            console.log('Received response from Exa API:', response.data);

            return response.data as ExaSearchResult;
        } catch (error: any) {
            // Log error with details
            console.error('Error searching X profile:', error.response?.data || error.message);
            throw new Error(`Exa API Error: ${error.response?.data?.message || 'Failed request'}`);
        }
    }

    /**
     * Extract relevant information from Exa search results
     * @param searchResult The search results from Exa
     * @returns Extracted profile information
     */
    extractProfileInfo(searchResult: ExaSearchResult): {
        tweets: string[];
        bio?: string;
        profileImageUrl?: string;
        name?: string;
    } {
        console.log('Extracting profile info from:', searchResult);
        
        if (!searchResult || !Array.isArray(searchResult.results)) {
            console.error('Invalid search result:', searchResult);
            throw new Error('No valid search results received from Exa API');
        }
    
        const profileInfo = {
            tweets: [] as string[],
            bio: undefined as string | undefined,
            profileImageUrl: undefined as string | undefined,
            name: undefined as string | undefined,
        };
    
        // Image extraction strategies
        const imageExtractors = [
            // Strategy 1: Direct image_url from results
            (result: ExaResult) => result.image_url || result.extra_info?.image_url,

            // Strategy 2: Extract image from text using regex
            (result: ExaResult) => {
                if (!result.text) return undefined;
                const imageRegex = /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)/i;
                const match = result.text.match(imageRegex);
                return match ? match[0] : undefined;
            },

            // Strategy 3: Extract profile image from Twitter/X URLs
            (result: ExaResult) => {
                if (!result.url) return undefined;
                const twitterImageRegex = /https?:\/\/(?:www\.)?twitter\.com\/[^/]+\/photo\/\d+/i;
                const match = result.url.match(twitterImageRegex);
                return match ? match[0] : undefined;
            }
        ];

        // Extract tweets and try to find profile image and name
        for (const result of searchResult.results) {
            // Collect tweets
            if (result.title && result.title.trim()) {
                profileInfo.tweets.push(result.title.trim());
            }

            // Try to extract profile image
            if (!profileInfo.profileImageUrl) {
                for (const extractor of imageExtractors) {
                    const extractedImage = extractor(result);
                    if (extractedImage) {
                        profileInfo.profileImageUrl = extractedImage;
                        break;
                    }
                }
            }

            // Try to extract name from title or URL
            if (!profileInfo.name) {
                // Extract name from title (e.g., "John Doe (@johndoe)")
                const nameMatch = result.title?.match(/^([^(@]+)/);
                if (nameMatch && nameMatch[1]) {
                    profileInfo.name = nameMatch[1].trim();
                }

                // Fallback: extract name from URL
                if (!profileInfo.name) {
                    const urlNameMatch = result.url?.match(/twitter\.com\/([^/]+)/i);
                    if (urlNameMatch && urlNameMatch[1]) {
                        profileInfo.name = urlNameMatch[1];
                    }
                }
            }

            // Try to extract bio
            if (!profileInfo.bio && result.text) {
                const bioLines = result.text
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line =>
                        line.length > 10 &&
                        !line.includes('Followers') &&
                        !line.includes('Following') &&
                        !line.includes('Posts') &&
                        !line.startsWith('@')
                    );

                if (bioLines.length > 0) {
                    profileInfo.bio = bioLines[0];
                }
            }
        }

        return profileInfo;
    }
}

// Export a factory function for testing or custom instances
export const createExaClient = (apiKey?: string) => new ExaClient(apiKey);

// Lazy-loaded singleton instance - only created when used
let clientInstance: ExaClient | null = null;
export const exaClient = () => {
    if (!clientInstance) {
        clientInstance = new ExaClient();
    }
    return clientInstance;
};