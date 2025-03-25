import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Persona } from '../types/persona';
import { Location, GooglePlacesResult, LocationCategory } from '../types/location';

/**
 * Client for interacting with Google Maps API
 */
export class GoogleMapsClient {
    private readonly apiKey: string | undefined;
    private readonly baseUrl: string = 'https://maps.googleapis.com/maps/api';

    constructor(apiKey?: string) {
        // Store API key but don't validate at construction time
        this.apiKey = apiKey || process.env.GOOGLE_MAPS_API_KEY;
    }

    /**
     * Validate that the API key is available
     */
    private validateApiKey() {
        if (!this.apiKey) {
            throw new Error('Google Maps API key is required');
        }
    }

    /**
     * Geocode a location string to coordinates
     * @param location The location to geocode (e.g., "New York, NY")
     * @returns The coordinates of the location
     */
    async geocodeLocation(location: string): Promise<{ lat: number; lng: number }> {
        try {
            // Validate API key when method is called
            this.validateApiKey();

            const response = await axios.get(
                `${this.baseUrl}/geocode/json`,
                {
                    params: {
                        address: location,
                        key: this.apiKey
                    }
                }
            );

            if (response.data.status === 'OK' && response.data.results.length > 0) {
                const { lat, lng } = response.data.results[0].geometry.location;
                return { lat, lng };
            } else {
                throw new Error(`Geocoding failed: ${response.data.status}`);
            }
        } catch (error) {
            console.error('Error geocoding location:', error);
            throw new Error('Failed to geocode location');
        }
    }

    /**
     * Find places near a location based on keywords
     * @param coordinates The coordinates to search near
     * @param keyword The keyword to search for
     * @param type Optional place type to filter by
     * @returns Array of places matching the search
     */
    async findPlaces(
        coordinates: { lat: number; lng: number },
        keyword: string,
        type?: string
    ): Promise<GooglePlacesResult[]> {
        try {
            // Validate API key when method is called
            this.validateApiKey();

            const response = await axios.get(
                `${this.baseUrl}/place/nearbysearch/json`,
                {
                    params: {
                        location: `${coordinates.lat},${coordinates.lng}`,
                        radius: 5000, // 5km radius
                        keyword,
                        type: type || '',
                        key: this.apiKey
                    }
                }
            );

            if (response.data.status === 'OK' || response.data.status === 'ZERO_RESULTS') {
                return response.data.results || [];
            } else {
                throw new Error(`Places search failed: ${response.data.status}`);
            }
        } catch (error) {
            console.error('Error finding places:', error);
            throw new Error('Failed to find places');
        }
    }

    /**
     * Get details for a specific place
     * @param placeId The Google Place ID
     * @returns Detailed information about the place
     */
    async getPlaceDetails(placeId: string): Promise<GooglePlacesResult> {
        try {
            // Validate API key when method is called
            this.validateApiKey();

            const response = await axios.get(
                `${this.baseUrl}/place/details/json`,
                {
                    params: {
                        place_id: placeId,
                        fields: 'name,formatted_address,geometry,rating,types,price_level,website,formatted_phone_number,opening_hours,photos',
                        key: this.apiKey
                    }
                }
            );

            if (response.data.status === 'OK') {
                return response.data.result;
            } else {
                throw new Error(`Place details failed: ${response.data.status}`);
            }
        } catch (error) {
            console.error('Error getting place details:', error);
            throw new Error('Failed to get place details');
        }
    }

    /**
     * Determine place category from Google place types
     * @param types The types from a Google place result
     * @returns The determined category
     */
    determineCategory(types: string[]): string {
        const typeToCategory: Record<string, string> = {
            'restaurant': LocationCategory.RESTAURANT,
            'cafe': LocationCategory.CAFE,
            'bar': LocationCategory.BAR,
            'park': LocationCategory.PARK,
            'museum': LocationCategory.MUSEUM,
            'shopping_mall': LocationCategory.SHOPPING,
            'store': LocationCategory.SHOPPING,
            'movie_theater': LocationCategory.ENTERTAINMENT,
            'amusement_park': LocationCategory.ENTERTAINMENT,
            'stadium': LocationCategory.SPORTS,
            'gym': LocationCategory.FITNESS,
            'university': LocationCategory.EDUCATION,
            'library': LocationCategory.EDUCATION,
            'school': LocationCategory.EDUCATION,
            'art_gallery': LocationCategory.ART,
            'night_club': LocationCategory.ENTERTAINMENT,
            'tourist_attraction': LocationCategory.ENTERTAINMENT,
        };

        // Find the first matching category
        for (const type of types) {
            if (typeToCategory[type]) {
                return typeToCategory[type];
            }
        }

        // Default to first type or "other"
        return types.length > 0 ? types[0].replace('_', ' ') : 'other';
    }

    /**
     * Generate a description of why this place matches the persona
     * @param place The place to describe
     * @param persona The user's persona
     * @returns A personalized description
     */
    generatePlaceDescription(place: GooglePlacesResult, persona: Persona): string {
        // Get a random trait and interest from the persona
        const randomTrait = persona.traits[Math.floor(Math.random() * persona.traits.length)];
        const randomInterest = persona.interests[Math.floor(Math.random() * persona.interests.length)];

        const category = this.determineCategory(place.types);

        // Create a description based on the category and persona
        const descriptions = [
            `This ${category} matches your ${randomTrait} personality and interest in ${randomInterest}.`,
            `As someone who is ${randomTrait} and loves ${randomInterest}, you'll appreciate this ${category}.`,
            `Perfect for someone with ${randomTrait} traits who enjoys ${randomInterest}.`,
            `This spot aligns well with your ${randomInterest} interest and ${randomTrait} nature.`,
            `Based on your ${randomTrait} personality, this ${category} should be a great fit.`
        ];

        // Choose a random description
        return descriptions[Math.floor(Math.random() * descriptions.length)];
    }

    /**
     * Find recommended locations based on a persona
     * @param persona The user's persona
     * @param userLocation The user's location
     * @returns Array of recommended locations
     */
    async findRecommendedLocations(
        persona: Persona,
        userLocation: string
    ): Promise<Location[]> {
        try {
            // For testing/development, provide mock data if env var is set
            if (process.env.USE_MOCK_DATA === 'true') {
                return this.getMockLocations(persona);
            }

            // Geocode the user's location
            const coordinates = await this.geocodeLocation(userLocation);

            // Create search keywords from traits and interests
            const searchTerms = [...persona.traits, ...persona.interests].slice(0, 5);

            const allPlaces: GooglePlacesResult[] = [];

            // Search for places using each search term
            for (const term of searchTerms) {
                const places = await this.findPlaces(coordinates, term);
                allPlaces.push(...places);
            }

            // Filter out duplicates by place_id
            const uniquePlaces = Array.from(
                new Map(allPlaces.map(place => [place.place_id, place])).values()
            );

            // Get more details for top 5 places
            const topPlaces = uniquePlaces.slice(0, 5);

            // Convert to our location format
            const locations: Location[] = topPlaces.map(place => ({
                id: uuidv4(),
                name: place.name,
                address: place.formatted_address || place.vicinity || '',
                description: this.generatePlaceDescription(place, persona),
                category: this.determineCategory(place.types),
                coordinates: {
                    lat: place.geometry.location.lat,
                    lng: place.geometry.location.lng
                },
                rating: place.rating,
                priceLevel: place.price_level
            }));

            return locations;
        } catch (error) {
            console.error('Error finding recommended locations:', error);

            // If real API fails, return mock data for development/testing
            if (process.env.NODE_ENV !== 'production') {
                console.log('Returning mock location data due to API error');
                return this.getMockLocations(persona);
            }

            throw new Error('Failed to find recommended locations');
        }
    }

    /**
     * Generate mock location data for testing
     * @param persona The user's persona to generate mock data for
     * @returns Array of mock locations
     */
    private getMockLocations(persona: Persona): Location[] {
        // Toronto coordinates for center
        const center = { lat: 43.6532, lng: -79.3832 };
        const categories = ['restaurant', 'cafe', 'museum', 'park', 'bar'];

        return Array(5).fill(0).map((_, index) => {
            // Generate positions within ~2km of center
            const lat = center.lat + (Math.random() - 0.5) * 0.03;
            const lng = center.lng + (Math.random() - 0.5) * 0.03;

            // Pick a trait and interest for description
            const trait = persona.traits[index % persona.traits.length];
            const interest = persona.interests[index % persona.interests.length];

            // Pick a category
            const category = categories[index % categories.length];

            return {
                id: uuidv4(),
                name: `Toronto ${category.charAt(0).toUpperCase() + category.slice(1)} ${index + 1}`,
                address: `${index * 100 + 100} ${category.charAt(0).toUpperCase() + category.slice(1)} St, Toronto, ON`,
                description: `This ${category} is perfect for someone with ${trait} traits who enjoys ${interest}.`,
                category,
                coordinates: { lat, lng },
                rating: 3.5 + Math.random() * 1.5,
            };
        });
    }
}

// Export a factory function for testing or custom instances
export const createGoogleMapsClient = (apiKey?: string) => new GoogleMapsClient(apiKey);

// Lazy-loaded singleton instance - only created when used
let clientInstance: GoogleMapsClient | null = null;
export const googleMapsClient = () => {
    if (!clientInstance) {
        clientInstance = new GoogleMapsClient();
    }
    return clientInstance;
};