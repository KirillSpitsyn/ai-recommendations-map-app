/**
 * API Request and Response Types
 */

// Persona API
export interface GeneratePersonaRequest {
    xHandle: string;
}

export interface GeneratePersonaResponse {
    success: boolean;
    persona?: {
        name: string;
        handle: string;
        bio: string;
        traits: string[];
        interests: string[];
        profileImageUrl?: string;
    };
    error?: string;
}

// Locations API
export interface GenerateLocationsRequest {
    persona: {
        name: string;
        handle: string;
        bio: string;
        traits: string[];
        interests: string[];
    };
    location: string;
}

export interface GenerateLocationsResponse {
    success: boolean;
    locations?: Array<{
        id: string;
        name: string;
        address: string;
        description: string;
        category: string;
        coordinates: {
            lat: number;
            lng: number;
        };
        rating?: number;
        website?: string;
    }>;
    error?: string;
}

// Exa API Response Types
export interface ExaSearchResult {
    requestId: string;
    results: ExaResult[];
}

export interface ExaResult {
    id: string;
    title: string;
    url: string;
    author?: string | null;
    text?: string;
    highlights?: string[];
    // Add image-related fields
    image_url?: string;
    image_urls?: string[];
    extra_info?: {
        image_url?: string;
        title?: string;
        author?: string;
        publish_date?: string;
    };
}


// OpenAI API Types
export interface OpenAIPersonaResponse {
    name: string;
    handle: string;
    bio: string;
    traits: string[];
    interests: string[];
}
