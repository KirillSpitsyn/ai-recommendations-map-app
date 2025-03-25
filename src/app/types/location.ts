/**
 * Location-related Types
 */

// Basic location coordinate type
export interface Coordinates {
    lat: number;
    lng: number;
}

// Location category enum
export enum LocationCategory {
    RESTAURANT = 'restaurant',
    CAFE = 'cafe',
    BAR = 'bar',
    PARK = 'park',
    MUSEUM = 'museum',
    SHOPPING = 'shopping',
    ENTERTAINMENT = 'entertainment',
    SPORTS = 'sports',
    FITNESS = 'fitness',
    EDUCATION = 'education',
    WORK = 'work',
    TECH = 'tech',
    ART = 'art',
    MUSIC = 'music',
    OUTDOOR = 'outdoor',
}

// Location detail type
export interface Location {
    id: string;
    name: string;
    address: string;
    description: string;
    category: string;
    coordinates: Coordinates;
    rating?: number;
    photos?: string[];
    website?: string;
    phone?: string;
    openingHours?: string[];
    priceLevel?: number; // 1-4 scale
    relevanceScore?: number; // Calculated relevance to persona (0-100)
}

// Location recommendation context
export interface LocationRecommendationContext {
    trait: string;
    interest: string;
    relevance: string;
}

// Location recommendation with context
export interface LocationRecommendation {
    location: Location;
    context: LocationRecommendationContext;
}

// Google Places API result (simplified)
export interface GooglePlacesResult {
    place_id: string;
    name: string;
    formatted_address: string;
    geometry: {
        location: {
            lat: number;
            lng: number;
        };
    };
    types: string[];
    rating?: number;
    user_ratings_total?: number;
    photos?: Array<{
        photo_reference: string;
        height: number;
        width: number;
    }>;
    price_level?: number;
    vicinity?: string;
    website?: string;
    formatted_phone_number?: string;
    opening_hours?: {
        weekday_text: string[];
    };
}