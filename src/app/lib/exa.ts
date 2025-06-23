import axios from 'axios';
import { ExaSearchResult, ExaResult } from '../types/api';

/**
 * Updated Client for interacting with the Exa API - Fixed for Twitter/X search issues
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
    private validateApiKey(): void {
        if (!this.apiKey) {
            throw new Error('Exa API key is required');
        }
    }

    /**
     * Search for content related to an X handle with improved search strategy
     * @param xHandle The X (Twitter) handle to search for
     * @returns Search results from Exa
     */
    async searchXProfile(xHandle: string): Promise<ExaSearchResult> {
        try {
            // Validate API key when method is called
            this.validateApiKey();

            // Clean handle (remove @ if present)
            const cleanHandle = xHandle.replace(/^@/, '');

            // Try multiple search strategies specifically targeting profile pages
            const searchStrategies = [
                // Strategy 1: Direct profile URL search - most likely to get bio
                {
                    query: `site:x.com/${cleanHandle} OR site:twitter.com/${cleanHandle}`,
                    use_autoprompt: false,
                    type: "keyword",
                    include_domains: ['x.com', 'twitter.com'],
                },
                // Strategy 2: Profile page with autoprompt
                {
                    query: `${cleanHandle} X Twitter profile page bio`,
                    use_autoprompt: true,
                    type: "auto",
                    include_domains: ['x.com', 'twitter.com'],
                },
                // Strategy 3: User mention search
                {
                    query: `@${cleanHandle} OR from:${cleanHandle}`,
                    use_autoprompt: false,
                    type: "keyword",
                    include_domains: ['x.com', 'twitter.com'],
                },
                // Strategy 4: Broader search without strict domain filtering (fallback)
                {
                    query: `"${cleanHandle}" X Twitter profile bio`,
                    use_autoprompt: true,
                    type: "auto",
                }
            ];

            let lastError: Error | null = null;
            let searchResult: ExaSearchResult | null = null;

            // Try each strategy until one works
            for (let i = 0; i < searchStrategies.length; i++) {
                const strategy = searchStrategies[i];
                
                console.log(`Trying search strategy ${i + 1}:`, {
                    query: strategy.query,
                    use_autoprompt: strategy.use_autoprompt,
                    type: strategy.type,
                    include_domains: strategy.include_domains || 'none',
                });

                try {
                    // Make request to Exa API
                    const response = await axios.post(
                        this.baseUrl,
                        {
                            query: strategy.query,
                            num_results: 15, 
                            use_autoprompt: strategy.use_autoprompt,
                            type: strategy.type,
                            include_domains: strategy.include_domains,
                            highlights: {
                                num_sentences: 5,
                                highlights_per_url: 3
                            },
                            text: true,
                        },
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'x-api-key': this.apiKey,
                            },
                            timeout: 30000,
                        }
                    );

                    console.log(`Strategy ${i + 1} response:`, {
                        status: response.status,
                        resultCount: response.data?.results?.length || 0,
                    });

                    // Check if we got valid results
                    if (response.data && response.data.results && response.data.results.length > 0) {
                        // Filter results to ensure they're relevant to the user
                        const relevantResults = this.filterRelevantResults(response.data.results, cleanHandle);
                        
                        if (relevantResults.length > 0) {
                            console.log(`Strategy ${i + 1} succeeded with ${relevantResults.length} relevant results`);
                            searchResult = {
                                ...response.data,
                                results: relevantResults
                            } as ExaSearchResult;
                            break;
                        }
                    }

                    // If no relevant results, try next strategy
                    console.log(`Strategy ${i + 1} returned no relevant results, trying next...`);

                } catch (error: any) {
                    console.error(`Strategy ${i + 1} failed:`, error.response?.data || error.message);
                    lastError = error;
                    
                    // If it's a rate limit or auth error, don't try other strategies
                    if (error.response?.status === 429 || error.response?.status === 401) {
                        throw error;
                    }
                    
                    // Continue to next strategy for other errors
                    continue;
                }
            }

            // If we found results but they lack content, try to fetch content separately
            if (searchResult && searchResult.results.length > 0) {
                const hasContent = searchResult.results.some(result => 
                    (result.text && result.text.length > 50) || 
                    (result.highlights && result.highlights.length > 0)
                );

                if (!hasContent) {
                    console.log('Search results lack content, attempting to fetch page contents...');
                    searchResult = await this.enrichResultsWithContent(searchResult);
                }

                return searchResult;
            }

            // If all strategies failed, throw the last error or a generic one
            throw lastError || new Error('All search strategies failed to find relevant content');

        } catch (error: any) {
            // Check if error is a timeout
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                console.error('Exa API request timed out');
                throw new Error('Request timed out. Please try again later.');
            }
            
            // Check for specific API errors
            if (error.response?.status === 401) {
                throw new Error('Invalid Exa API key. Please check your API key.');
            }
            
            if (error.response?.status === 429) {
                throw new Error('Rate limit exceeded. Please try again later.');
            }
            
            // Log error with details
            console.error('Error searching X profile:', error.response?.data || error.message);
            throw new Error(`Exa API Error: ${error.response?.data?.message || error.message || 'Failed request'}`);
        }
    }

    /**
     * Enrich search results with actual page content using Exa's contents API
     * @param searchResult The search results lacking content
     * @returns Enhanced search results with content
     */
    private async enrichResultsWithContent(searchResult: ExaSearchResult): Promise<ExaSearchResult> {
        try {
            // Get URLs that look like actual Twitter/X profiles
            const twitterUrls = searchResult.results
                .filter(result => 
                    result.url && (
                        result.url.includes('x.com/') || 
                        result.url.includes('twitter.com/')
                    ) && 
                    !result.url.includes('/status/') // Avoid individual tweet URLs
                )
                .map(result => result.url)
                .slice(0, 5); // Limit to 5 URLs to avoid excessive API calls

            if (twitterUrls.length === 0) {
                console.log('No Twitter URLs found for content enrichment');
                return searchResult;
            }

            console.log('Fetching content for URLs:', twitterUrls);

            // Make request to Exa contents API
            const response = await axios.post(
                'https://api.exa.ai/contents',
                {
                    urls: twitterUrls,
                    text: true,
                    highlights: {
                        num_sentences: 5,
                        highlights_per_url: 3
                    }
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': this.apiKey,
                    },
                    timeout: 30000,
                }
            );

            if (response.data && response.data.results) {
                console.log(`Enriched ${response.data.results.length} results with content`);

                // Merge the enriched content back into our search results
                const enrichedResults = searchResult.results.map(originalResult => {
                    const enrichedResult = response.data.results.find(
                        (contentResult: any) => contentResult.url === originalResult.url
                    );

                    if (enrichedResult) {
                        return {
                            ...originalResult,
                            text: enrichedResult.text || originalResult.text,
                            highlights: enrichedResult.highlights || originalResult.highlights
                        };
                    }

                    return originalResult;
                });

                return {
                    ...searchResult,
                    results: enrichedResults
                };
            }

        } catch (error: any) {
            console.error('Error enriching results with content:', error.response?.data || error.message);
            // Return original results if enrichment fails
        }

        return searchResult;
    }

    /**
     * Filter results to ensure they're relevant to the requested user
     * @param results Raw results from Exa
     * @param handle The handle we're searching for
     * @returns Filtered relevant results
     */
    private filterRelevantResults(results: ExaResult[], handle: string): ExaResult[] {
        const lowerHandle = handle.toLowerCase();
        
        return results.filter(result => {
            // Check if the result contains the handle in URL, title, or text
            const urlMatch = result.url?.toLowerCase().includes(lowerHandle) || 
                           result.url?.toLowerCase().includes(`/${lowerHandle}`) ||
                           result.url?.toLowerCase().includes(`@${lowerHandle}`);
            
            const titleMatch = result.title?.toLowerCase().includes(`@${lowerHandle}`) ||
                             result.title?.toLowerCase().includes(lowerHandle);
            
            const textMatch = result.text?.toLowerCase().includes(`@${lowerHandle}`) ||
                            result.text?.toLowerCase().includes(`from:${lowerHandle}`);
            
            const highlightMatch = result.highlights?.some(h => 
                h.toLowerCase().includes(`@${lowerHandle}`) ||
                h.toLowerCase().includes(lowerHandle)
            );

            return urlMatch || titleMatch || textMatch || highlightMatch;
        });
    }

    /**
     * Extract relevant information from Exa search results - Updated for better parsing
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
        console.log('Extracting profile info from:', {
            resultCount: searchResult?.results?.length || 0,
            requestId: searchResult?.requestId
        });
        
        if (!searchResult || !Array.isArray(searchResult.results)) {
            console.error('Invalid search result:', searchResult);
            throw new Error('No valid search results received from Exa API');
        }
    
        // Debug: Log the actual results to understand the structure
        searchResult.results.forEach((result, index) => {
            console.log(`Result ${index}:`, {
                title: result.title?.substring(0, 100) + '...',
                url: result.url,
                textLength: result.text?.length || 0,
                textPreview: result.text?.substring(0, 200) + '...',
                highlightsCount: result.highlights?.length || 0,
                highlights: result.highlights?.map(h => h.substring(0, 100) + '...'),
            });
        });
    
        // Start with the requested handle to ensure we're showing data for the right user
        const capitalizedHandle = requestedHandle.charAt(0).toUpperCase() + requestedHandle.slice(1);
        
        const profileInfo = {
            tweets: [] as string[],
            bio: `X user @${requestedHandle}`, // Initialize with default bio
            profileImageUrl: undefined as string | undefined,
            name: capitalizedHandle, // Default to capitalized handle
            handle: requestedHandle, // Default to the requested handle
        };

        // Extract tweets from results
        const tweetTexts = new Set<string>(); // Use Set to avoid duplicates
        
        searchResult.results.forEach(result => {
            // Extract tweets from title (often contains tweet content)
            if (result.title && result.title.trim() && 
                !result.title.includes('| X') && 
                !result.title.includes('X (formerly Twitter)') &&
                !result.title.includes('Home / X') &&
                result.title.length > 10) {
                tweetTexts.add(result.title.trim());
            }

            // Extract tweets from highlights (often contains the best content)
            if (result.highlights) {
                result.highlights.forEach(highlight => {
                    if (highlight && highlight.trim() && highlight.length > 10) {
                        tweetTexts.add(highlight.trim());
                    }
                });
            }

            // Extract tweets from text content
            if (result.text) {
                // Split text into potential tweets (by line breaks or common separators)
                const textLines = result.text
                    .split(/\n|•|—|–/)
                    .map(line => line.trim())
                    .filter(line => 
                        line.length > 20 && 
                        line.length < 300 && // Twitter character limit
                        !line.includes('Followers') &&
                        !line.includes('Following') &&
                        !line.includes('Posts')
                    );
                
                textLines.forEach(line => tweetTexts.add(line));
            }
        });

        // Convert Set back to Array and limit to most relevant
        profileInfo.tweets = Array.from(tweetTexts).slice(0, 20);

        // Extract bio - Enhanced to find actual Twitter bio content
        let foundBio = false;
        console.log('Starting bio extraction...');
        
        for (const result of searchResult.results) {
            if (foundBio) break;

            console.log('Checking result for bio:', {
                url: result.url,
                titleLength: result.title?.length || 0,
                textLength: result.text?.length || 0,
                highlightsCount: result.highlights?.length || 0
            });

            // Strategy 1: Extract bio from Twitter-specific patterns in text content
            if (!foundBio && result.text && result.text.length > 0) {
                console.log('Analyzing text for Twitter bio patterns...');
                
                const bioFromText = this.extractTwitterBioFromText(result.text, requestedHandle);
                if (bioFromText) {
                    console.log('Found bio in text content:', bioFromText);
                    profileInfo.bio = bioFromText;
                    foundBio = true;
                }
            }

            // Strategy 2: Check highlights for bio content
            if (!foundBio && result.highlights && result.highlights.length > 0) {
                console.log('Checking highlights:', result.highlights);
                for (const highlight of result.highlights) {
                    console.log('Evaluating highlight:', {
                        text: highlight.substring(0, 100) + '...',
                        length: highlight.length,
                    });

                    // Look for descriptive content that could be a bio
                    if (this.isValidBioContent(highlight, requestedHandle)) {
                        console.log('Found bio in highlight:', highlight);
                        profileInfo.bio = highlight;
                        foundBio = true;
                        break;
                    }
                }
            }

            // Strategy 3: Extract from meta tags or structured data if present in text
            if (!foundBio && result.text) {
                const metaBio = this.extractBioFromMetaTags(result.text);
                if (metaBio) {
                    console.log('Found bio in meta tags:', metaBio);
                    profileInfo.bio = metaBio;
                    foundBio = true;
                }
            }

            // Strategy 4: Check title for potential bio information (fallback)
            if (!foundBio && result.title) {
                const titleParts = result.title.split(/[|•@]/).map(part => part.trim());
                for (const part of titleParts) {
                    if (this.isValidBioContent(part, requestedHandle)) {
                        console.log('Found bio in title part:', part);
                        profileInfo.bio = part;
                        foundBio = true;
                        break;
                    }
                }
            }
        }

        // If no bio found, create a better default based on available information
        if (!foundBio) {
            console.log('No bio found, creating enhanced default...');
            
            // Try to infer bio from the user's name and context
            const inferredBio = this.generateInferredBio(profileInfo.name, requestedHandle, searchResult.results);
            profileInfo.bio = inferredBio;
        }

        // Extract name from title patterns
        for (const result of searchResult.results) {
            if (result.title) {
                // Look for patterns like "Name (@handle)" or "Name | X"
                const nameRegex = /^([^(@|]+?)(?:\s*[\(@|]|$)/;
                const nameMatch = result.title.match(nameRegex);
                if (nameMatch && nameMatch[1] && nameMatch[1].trim()) {
                    const extractedName = nameMatch[1].trim();
                    // Only use if it's not obviously a website title
                    if (!extractedName.includes('X (formerly Twitter)') && 
                        !extractedName.includes('Home / X') &&
                        !extractedName.includes('twitter.com') &&
                        extractedName.length < 50) {
                        profileInfo.name = extractedName;
                        break;
                    }
                }
            }
        }

        console.log("Final extracted profile info:", {
            name: profileInfo.name,
            handle: profileInfo.handle,
            bio: profileInfo.bio,
            bioLength: profileInfo.bio.length,
            tweetCount: profileInfo.tweets.length
        });

        return profileInfo;
    }

    /**
     * Extract Twitter bio from text content using specific patterns
     * @param text The text content to analyze
     * @param handle The user handle to avoid including
     * @returns Extracted bio or null
     */
    private extractTwitterBioFromText(text: string, handle: string): string | null {
        // Pattern 1: Look for text after handle mention patterns
        const handlePatterns = [
            new RegExp(`@${handle}\\s*(.{20,300})`, 'i'),
            new RegExp(`${handle}\\s*(.{20,300})`, 'i'),
        ];

        for (const pattern of handlePatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                const bioCandidate = match[1].trim();
                if (this.isValidBioContent(bioCandidate, handle)) {
                    return bioCandidate;
                }
            }
        }

        // Pattern 2: Look for descriptive paragraphs (common bio length)
        const paragraphs = text
            .split(/\n\n+/)
            .map(p => p.trim())
            .filter(p => p.length >= 30 && p.length <= 300);

        for (const paragraph of paragraphs) {
            if (this.isValidBioContent(paragraph, handle)) {
                return paragraph;
            }
        }

        // Pattern 3: Look for sentences that describe the user/organization
        const sentences = text
            .split(/[.!?]+/)
            .map(s => s.trim())
            .filter(s => s.length >= 20 && s.length <= 250);

        for (const sentence of sentences) {
            // Look for sentences that sound like bio descriptions
            if (sentence.includes('largest') || 
                sentence.includes('building') || 
                sentence.includes('organization') ||
                sentence.includes('community') ||
                sentence.includes('tech') ||
                sentence.includes('innovation') ||
                sentence.includes('excellence') ||
                sentence.match(/^[A-Z].*(?:org|organization|community|group|team|company)/i)) {
                
                if (this.isValidBioContent(sentence, handle)) {
                    return sentence;
                }
            }
        }

        return null;
    }

    /**
     * Check if content looks like a valid Twitter bio
     * @param content The content to validate
     * @param handle The user handle to avoid including
     * @returns Whether the content is a valid bio
     */
    private isValidBioContent(content: string, handle: string): boolean {
        if (!content || content.length < 15 || content.length > 300) {
            return false;
        }

        // Exclude common non-bio patterns
        const excludePatterns = [
            /followers?:/i,
            /following:/i,
            /posts?:/i,
            /joined /i,
            /instagram photos and videos/i,
            /twitter profile/i,
            /x \(formerly twitter\)/i,
            /home \/ x/i,
            /photos et vidéos/i,
            /song by/i,
            /\d{1,3}(,\d{3})+ followers/i,
            /^https?:\/\//,
            /^www\./,
            /instalker\.org/i
        ];

        for (const pattern of excludePatterns) {
            if (pattern.test(content)) {
                return false;
            }
        }

        // Exclude if it's just the handle
        if (content.toLowerCase().includes(handle.toLowerCase()) && content.length < 30) {
            return false;
        }

        // Look for positive bio indicators
        const bioIndicators = [
            /\b(organization|community|group|team|company|startup|agency)\b/i,
            /\b(build|create|develop|innovate|transform|leading|largest)\b/i,
            /\b(tech|technology|innovation|excellence|talent|professional)\b/i,
            /\b(passionate|dedicated|committed|focused|specialized)\b/i
        ];

        const hasPositiveIndicator = bioIndicators.some(pattern => pattern.test(content));
        
        // If it has bio indicators, it's likely a good bio
        if (hasPositiveIndicator) {
            return true;
        }

        // Even without indicators, if it's descriptive text, it might be bio
        const words = content.split(/\s+/);
        const hasDescriptiveWords = words.length >= 5 && words.length <= 50;
        const hasProperCapitalization = /^[A-Z]/.test(content);
        
        return hasDescriptiveWords && hasProperCapitalization;
    }

    /**
     * Extract bio from meta tags in HTML content
     * @param text The HTML text content
     * @returns Extracted bio from meta tags or null
     */
    private extractBioFromMetaTags(text: string): string | null {
        // Look for meta description tags
        const metaPatterns = [
            /<meta\s+name=["']description["']\s+content=["']([^"']{20,300})["']/i,
            /<meta\s+property=["']og:description["']\s+content=["']([^"']{20,300})["']/i,
            /<meta\s+name=["']twitter:description["']\s+content=["']([^"']{20,300})["']/i,
        ];

        for (const pattern of metaPatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                const bioCandidate = match[1].trim();
                if (bioCandidate.length >= 20 && bioCandidate.length <= 300) {
                    return bioCandidate;
                }
            }
        }

        return null;
    }

    /**
     * Generate an inferred bio when actual bio content is not available
     * @param name The extracted name
     * @param handle The user handle
     * @param results Search results to infer from
     * @returns An inferred bio string
     */
    private generateInferredBio(name: string, handle: string, results: ExaResult[]): string {
        const categories = new Set<string>();
        const keywords = new Set<string>();

        // Analyze URLs and titles to infer user type/interests
        results.forEach(result => {
            if (result.url) {
                // Check for platform indicators
                if (result.url.includes('instagram')) categories.add('social media creator');
                if (result.url.includes('linkedin')) categories.add('professional');
                if (result.url.includes('github')) categories.add('developer');
                if (result.url.includes('youtube')) categories.add('content creator');
                if (result.url.includes('music')) categories.add('musician');
                if (result.url.includes('artist')) categories.add('artist');
            }

            if (result.title) {
                const title = result.title.toLowerCase();
                // Look for profession/interest indicators in titles
                if (title.includes('developer') || title.includes('dev')) keywords.add('developer');
                if (title.includes('design') || title.includes('designer')) keywords.add('designer');
                if (title.includes('music') || title.includes('musician')) keywords.add('musician');
                if (title.includes('artist')) keywords.add('artist');
                if (title.includes('writer')) keywords.add('writer');
                if (title.includes('entrepreneur')) keywords.add('entrepreneur');
                if (title.includes('ceo') || title.includes('founder')) keywords.add('entrepreneur');
                if (title.includes('tech') || title.includes('technology')) keywords.add('tech enthusiast');
                if (title.includes('crypto') || title.includes('blockchain') || title.includes('dao')) keywords.add('crypto enthusiast');
                if (title.includes('nft')) keywords.add('NFT creator');
            }
        });

        // Generate bio based on inferred information
        const allDescriptors = [...categories, ...keywords];
        
        if (allDescriptors.length > 0) {
            const primaryDescriptor = allDescriptors[0];
            return `${name} • ${primaryDescriptor} • X user @${handle}`;
        }

        // If we can't infer anything specific, check if name suggests organization vs individual
        if (name.includes('DAO') || name.includes('Corp') || name.includes('Inc') || 
            name.includes('Lab') || name.includes('Studio') || name.includes('Team')) {
            return `${name} • Organization • Follow us on X @${handle}`;
        }

        // Default fallback
        return `${name} X user @${handle}`;
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
