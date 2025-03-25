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
            <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                <div className="flex items-center space-x-4">
                    <div className="rounded-full bg-gray-300 h-16 w-16"></div>
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                    </div>
                </div>
                <div className="space-y-3 mt-4">
                    <div className="h-4 bg-gray-300 rounded"></div>
                    <div className="h-4 bg-gray-300 rounded"></div>
                    <div className="h-4 bg-gray-300 rounded w-5/6"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-red-800">Error</h3>
                <p className="mt-2 text-sm text-red-700">{error}</p>
                <p className="mt-4 text-sm text-red-700">
                    Please check the X handle and try again. Make sure the account is public and exists.
                </p>
            </div>
        );
    }

    if (!persona) {
        return null;
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                    {persona.profileImageUrl ? (
                        <div className="rounded-full overflow-hidden h-16 w-16 relative border-2 border-blue-100">
                            <Image
                                src={persona.profileImageUrl}
                                alt={persona.name}
                                width={64}
                                height={64}
                                className="object-cover"
                            />
                        </div>
                    ) : (
                        <div className="rounded-full bg-blue-100 h-16 w-16 flex items-center justify-center">
              <span className="text-2xl text-blue-500">
                {persona.name.charAt(0).toUpperCase()}
              </span>
                        </div>
                    )}
                </div>

                <div className="flex-1">
                    <h2 className="text-xl font-bold">{persona.name}</h2>
                    <p className="text-gray-500">@{persona.handle}</p>
                    <p className="mt-2 text-gray-700">{persona.bio}</p>
                </div>
            </div>

            <div className="mt-6 space-y-4">
                <div>
                    <h3 className="font-medium text-gray-900">Key Traits</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {persona.traits.map((trait, index) => (
                            <span
                                key={index}
                                className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                            >
                {trait}
              </span>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="font-medium text-gray-900">Interests</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {persona.interests.map((interest, index) => (
                            <span
                                key={index}
                                className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
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