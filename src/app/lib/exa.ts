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

            // Construct search query - specifically target this exact user
            // Include both with and without @ format in the query
            const query = `site:twitter.com (from:${cleanHandle} OR "@${cleanHandle}") OR "twitter.com/${cleanHandle}"`;

            // Log the request before sending it
            console.log('Sending request to Exa API:', {
                query,
                num_results: 22,
                use_autoprompt: false, // Changed to false to avoid unrelated content
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
                    use_autoprompt: false, // Changed to false
                    include_domains: ['twitter.com', 'x.com'],
                    highlights: true,
                    text_search_strategy: 'keyword',
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': this.apiKey,
                    },
                    timeout: 25000, // 25 second timeout (allowing 5 seconds for processing on our side)
                }
            );
            console.log('Received response from Exa API:', response.data);

            return response.data as ExaSearchResult;
        } catch (error: any) {
            // Check if error is a timeout
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                console.error('Exa API request timed out');
                throw new Error('Request timed out. Please try again later.');
            }
            
            // Log error with details
            console.error('Error searching X profile:', error.response?.data || error.message);
            throw new Error(`Exa API Error: ${error.response?.data?.message || 'Failed request'}`);
        }
    }

    /**
     * Extract relevant information from Exa search results
     * @param searchResult The search results from Exa
     * @param requestedHandle The originally requested handle to use as fallback
     * @returns Extracted profile information
     */
    extractProfileInfo(searchResult: ExaSearchResult, requestedHandle: string): {
        tweets: string[];
        bio: string;
        profileImageUrl?: string;
        name: string; 
        handle: string;
    } {
        console.log('Extracting profile info from:', searchResult);
        
        if (!searchResult || !Array.isArray(searchResult.results)) {
            console.error('Invalid search result:', searchResult);
            throw new Error('No valid search results received from Exa API');
        }
    
        // Start with the requested handle to ensure we're showing data for the right user
        // Initialize name with capitalized handle as default
        const capitalizedHandle = requestedHandle.charAt(0).toUpperCase() + requestedHandle.slice(1);
        
        const profileInfo = {
            tweets: [] as string[],
            bio: `X user @${requestedHandle}`, // Initialize with default bio
            profileImageUrl: undefined as string | undefined,
            name: capitalizedHandle, // Default to capitalized handle
            handle: requestedHandle, // Default to the requested handle
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

        // Validate if results are for the requested handle - account for both with and without @ format
        const urlRegex = new RegExp(`twitter\\.com\\/${requestedHandle}|x\\.com\\/${requestedHandle}`, 'i');
        const handleRegex = new RegExp(`@${requestedHandle}|from:${requestedHandle}`, 'i');
        
        const validResults = searchResult.results.filter(result => {
            return (result.url && urlRegex.test(result.url)) || 
                   (result.text && handleRegex.test(result.text)) ||
                   (result.title && handleRegex.test(result.title));
        });

        // If no valid results found, use all results but with caution
        const resultsToProcess = validResults.length > 0 ? validResults : searchResult.results;

        // Better bio extraction - first look for results that might contain a bio
        let foundBio = false;
        
        // First attempt: Try to find bio from user profile pages
        for (const result of resultsToProcess) {
            // Look for results that are likely profile pages
            if (result.url && (result.url.includes(`/${requestedHandle}`) || result.url.endsWith(requestedHandle))) {
                if (result.text) {
                    // Extract potential bio content - look for text that follows patterns like "Bio:" or is between certain markers
                    // First approach: Look for paragraph-sized text that might be a bio
                    const paragraphs = result.text
                        .split('\n')
                        .map(line => line.trim())
                        .filter(line => 
                            line.length > 15 && 
                            line.length < 200 &&
                            !line.includes('Followers') &&
                            !line.includes('Following') &&
                            !line.includes('Posts') &&
                            !line.startsWith('@') &&
                            !line.includes('http')
                        );
                    
                    if (paragraphs.length > 0) {
                        // Use the first paragraph that looks like a bio
                        profileInfo.bio = paragraphs[0];
                        foundBio = true;
                        break;
                    }
                }
            }
        }
        
        // Second attempt if no bio found: Try looking for bio in text content or highlights
        if (!foundBio) {
            for (const result of resultsToProcess) {
                // Check highlights first as they often contain the bio
                if (result.highlights && result.highlights.length > 0) {
                    const bioCandidates = result.highlights
                        .filter(highlight => 
                            highlight.length > 15 && 
                            highlight.length < 200 &&
                            !highlight.includes('Followers') &&
                            !highlight.includes('Following') &&
                            !highlight.includes('Posts')
                        );
                    
                    if (bioCandidates.length > 0) {
                        profileInfo.bio = bioCandidates[0];
                        foundBio = true;
                        break;
                    }
                }
                
                // If still no bio, look in the text content
                if (!foundBio && result.text) {
                    const lines = result.text
                        .split('\n')
                        .map(line => line.trim())
                        .filter(line => 
                            line.length > 15 && 
                            line.length < 200 &&
                            !line.includes('Followers') &&
                            !line.includes('Following') &&
                            !line.includes('Posts') &&
                            !line.includes('replied') &&
                            !line.includes('reposted')
                        );
                    
                    if (lines.length > 0) {
                        profileInfo.bio = lines[0];
                        foundBio = true;
                        break;
                    }
                }
            }
        }

        // Extract tweets and other information
        for (const result of resultsToProcess) {
            // Collect tweets
            if (result.title && result.title.trim() && 
                !result.title.includes('(@') && 
                !result.title.includes('| X') && 
                !result.title.includes('X (formerly Twitter)')) {
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

            // Try to extract name from title
            // Look for patterns like "Name (@handle)" or "Name | X"
            const nameRegex = /^([^(@|]+)(?:\s*[\(@|]|$)/;
            const nameMatch = result.title?.match(nameRegex);
            if (nameMatch && nameMatch[1] && nameMatch[1].trim()) {
                const extractedName = nameMatch[1].trim();
                // Only use if it's not obviously a website title
                if (!extractedName.includes('X (formerly Twitter)') && 
                    !extractedName.includes('Home / X') &&
                    !extractedName.includes('twitter.com')) {
                    profileInfo.name = extractedName;
                }
            }
        }

        console.log("Extracted profile info:", profileInfo);
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
