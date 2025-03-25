/**
 * Persona-related Types
 */

// Basic persona type
export interface Persona {
    name: string;
    handle: string;
    bio: string;
    traits: string[];
    interests: string[];
    profileImageUrl?: string;
}

// Trait categories that might be identified
export enum TraitCategory {
    PERSONALITY = 'personality',
    COMMUNICATION = 'communication',
    LIFESTYLE = 'lifestyle',
    VALUES = 'values',
    PREFERENCES = 'preferences',
}

// Interest categories that might be identified
export enum InterestCategory {
    TECHNOLOGY = 'technology',
    ARTS = 'arts',
    SCIENCE = 'science',
    SPORTS = 'sports',
    FOOD = 'food',
    TRAVEL = 'travel',
    ENTERTAINMENT = 'entertainment',
    POLITICS = 'politics',
    BUSINESS = 'business',
    EDUCATION = 'education',
    HEALTH = 'health',
    FASHION = 'fashion',
    ENVIRONMENT = 'environment',
    MUSIC = 'music',
    GAMING = 'gaming',
}

// Type for persona generation context from X data
export interface PersonaGenerationContext {
    recentTweets: string[];
    bio: string;
    followingTopics?: string[];
    interactionTopics?: string[];
    profileDescription?: string;
}

// Enhanced persona with additional metadata
export interface EnhancedPersona extends Persona {
    confidence: number; // 0-100 score of how confident the AI is about this persona
    traitCategories: Record<string, TraitCategory>;
    interestCategories: Record<string, InterestCategory>;
    locationPreferences?: string[];
    activityPreferences?: string[];
    timePreferences?: string[]; // e.g., "morning person", "night owl"
}

// Categorized persona traits for recommendation purposes
export interface CategorizedPersonaTraits {
    foodPreferences: string[];
    activityPreferences: string[];
    socialPreferences: string[];
    environmentPreferences: string[];
    timePreferences: string[];
}