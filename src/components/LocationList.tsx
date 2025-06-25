'use client';

import React, { useContext, useEffect } from 'react';
import Image from 'next/image';
import { PlacePhotosContext } from './LocationMap';

export interface Location {
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
}

interface LocationListProps {
    locations: Location[];
    selectedLocationId: string | null;
    onLocationSelect: (locationId: string) => void;
    profileImage?: string;
}

const LocationList: React.FC<LocationListProps> = ({
    locations,
    selectedLocationId,
    onLocationSelect,
    profileImage,
}) => {
    // Get place photos from context
    const placePhotos = useContext(PlacePhotosContext);
    
    // Debug logging
    useEffect(() => {
        console.log("LocationList received placePhotos:", placePhotos);
    }, [placePhotos]);

    // Helper function to check if a website URL is valid
    const isValidWebsite = (url?: string): boolean => {
        if (!url) return false;
        // Check if it's a Google Maps link or not a proper URL
        if (url.includes('google.com/maps')) return false;
        
        // Try to validate it's a real website URL
        try {
            const websiteUrl = new URL(url);
            return websiteUrl.protocol.startsWith('http') && websiteUrl.hostname.includes('.');
        } catch (e) {
            return false;
        }
    };

    if (!locations.length) {
        return (
            <div className="bg-card-bg bg-opacity-50 p-4 rounded-md text-center text-primary border border-border transition-colors duration-200">
                No locations found.
            </div>
        );
    }

    const getCategoryEmoji = (category: string): string => {
        const categories: Record<string, string> = {
            restaurant: '🍽️',
            cafe: '☕',
            bar: '🍸',
            park: '🌳',
            museum: '🏛️',
            shopping: '🛍️',
            entertainment: '🎭',
            attraction: '🏙️',
            shop: '🛍️',
            sports: '🏃',
            fitness: '💪',
            education: '📚',
            work: '💼',
            tech: '💻',
            art: '🎨',
            music: '🎵',
            outdoor: '🏞️',
            default: '📍'
        };

        return categories[category.toLowerCase()] || categories.default;
    };

    return (
        <div className="space-y-4 mt-4">
            <h2 className="text-xl font-bold text-primary transition-colors duration-200">Recommended Locations</h2>
            <p className="text-sm text-primary transition-colors duration-200">Based on your X persona profile</p>

            <div className="space-y-3">
                {locations.map((location, index) => {
                    const photoUrl = placePhotos?.[location.id];
                    console.log(`Location ${location.id} (${location.name}) photo:`, photoUrl);
                    
                    return (
                        <div
                            key={location.id}
                            className={`border rounded-lg overflow-hidden shadow-sm transition-all cursor-pointer ${
                                selectedLocationId === location.id
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-800'
                                    : 'border-border hover:bg-card-bg'
                            } transition-colors duration-200`}
                            onClick={() => onLocationSelect(location.id)}
                        >
                            <div className="p-4">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 mr-3">
                                        {profileImage ? (
                                            <div className="w-10 h-10 rounded-full overflow-hidden relative">
                                                <Image
                                                    src={profileImage}
                                                    alt="Profile"
                                                    width={40}
                                                    height={40}
                                                    className="object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-xl transition-colors duration-200">
                                                {getCategoryEmoji(location.category)}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-grow">
                                        <div className="flex justify-between items-start">
                                            <h3 className={`font-medium text-lg transition-colors duration-200 ${
                                                selectedLocationId === location.id 
                                                    ? 'text-gray-900 dark:text-white' 
                                                    : 'text-primary'
                                            }`}>{location.name}</h3>
                                            {location.rating && (
                                                <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs font-medium transition-colors duration-200">
                                                    ★ {typeof location.rating === 'number' ? location.rating.toFixed(1) : location.rating}
                                                </div>
                                            )}
                                        </div>

                                        <p className={`text-sm mt-1 transition-colors duration-200 ${
                                            selectedLocationId === location.id 
                                                ? 'text-gray-700 dark:text-gray-700' 
                                                : 'text-primary'
                                        }`}>{location.address}</p>

                                        {/* Place photo - shows actual Google photo if available */}
                                        {photoUrl && (
                                            <div className="mt-3 mb-3 w-full h-36 relative rounded overflow-hidden">
                                                <img 
                                                    src={photoUrl} 
                                                    alt={location.name}
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute top-2 right-2 bg-white dark:bg-gray-800 bg-opacity-75 dark:bg-opacity-75 rounded-full w-8 h-8 flex items-center justify-center text-gray-700 dark:text-gray-300 text-sm font-bold transition-colors duration-200">
                                                    {index + 1}
                                                </div>
                                            </div>
                                        )}

                                        <div className="mt-2">
                                            <span className="inline-block bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors duration-200">
                                                {getCategoryEmoji(location.category)} {location.category}
                                            </span>
                                        </div>

                                        <p className={`mt-2 text-sm transition-colors duration-200 ${
                                            selectedLocationId === location.id 
                                                ? 'text-gray-700 dark:text-gray-700' 
                                                : 'text-primary'
                                        }`}>{location.description}</p>
                                        
                                        {/* Website link - only if it's a valid URL */}
                                        {isValidWebsite(location.website) && (
                                            <div className="mt-3">
                                                <a 
                                                    href={location.website}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm transition-colors duration-200"
                                                    onClick={(e) => e.stopPropagation()} // Prevent triggering parent onClick
                                                >
                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                    Visit Official Website
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default LocationList;
