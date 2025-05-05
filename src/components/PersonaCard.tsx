'use client';

import React from 'react';
import Image from 'next/image';

export interface Persona {
    name: string;
    handle: string;
    bio: string;
    traits: string[];
    interests: string[];
    profileImageUrl?: string;
}

interface PersonaCardProps {
    persona: Persona | null;
    isLoading: boolean;
    error?: string | null;
}

const PersonaCard: React.FC<PersonaCardProps> = ({ persona, isLoading, error }) => {
    if (isLoading) {
        return (
            <div className="bg-card-bg rounded-lg shadow-md p-6 animate-pulse border border-border transition-colors duration-200">
                <div className="flex items-center space-x-4">
                    <div className="rounded-full bg-border h-16 w-16 transition-colors duration-200"></div>
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-border rounded w-3/4 transition-colors duration-200"></div>
                        <div className="h-4 bg-border rounded w-1/2 transition-colors duration-200"></div>
                    </div>
                </div>
                <div className="space-y-3 mt-4">
                    <div className="h-4 bg-border rounded transition-colors duration-200"></div>
                    <div className="h-4 bg-border rounded transition-colors duration-200"></div>
                    <div className="h-4 bg-border rounded w-5/6 transition-colors duration-200"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 dark:bg-red-900 dark:bg-opacity-20 border border-red-200 dark:border-red-800 rounded-lg p-6 transition-colors duration-200">
                <h3 className="text-lg font-medium text-red-800 dark:text-red-300 transition-colors duration-200">Error</h3>
                <p className="mt-2 text-sm text-red-700 dark:text-red-300 transition-colors duration-200">{error}</p>
                <p className="mt-4 text-sm text-red-700 dark:text-red-300 transition-colors duration-200">
                    Please check the X handle and try again. Make sure the account is public and exists.
                </p>
            </div>
        );
    }

    if (!persona) {
        return null;
    }

    return (
        <div className="bg-card-bg rounded-lg shadow-md p-6 border border-border transition-colors duration-200">
            <div className="flex items-start space-x-4">
                <div className="flex-1">
                    <h2 className="text-xl text-primary transition-colors duration-200">{persona.name}</h2>
                    <p className="text-primary transition-colors duration-200">@{persona.handle}</p>
                    <p className="mt-2 text-primary transition-colors duration-200">{persona.bio}</p>
                </div>
            </div>

            <div className="mt-6 space-y-4">
                <div>
                    <h3 className="font-medium text-primary transition-colors duration-200">Key Traits</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {persona.traits.map((trait, index) => (
                            <span
                                key={index}
                                className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm transition-colors duration-200"
                            >
                                {trait}
                            </span>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="font-medium text-primary transition-colors duration-200">Interests</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {persona.interests.map((interest, index) => (
                            <span
                                key={index}
                                className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm transition-colors duration-200"
                            >
                                {interest}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PersonaCard;
