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

    if (!locations.length) {
        return (
            <div className="bg-gray-50 p-4 rounded-md text-center text-gray-500">
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
            <h2 className="text-xl font-bold">Recommended Locations</h2>
            <p className="text-sm text-black">Based on your X persona profile</p>

            <div className="space-y-3">
                {locations.map((location, index) => {
                    const photoUrl = placePhotos?.[location.id];
                    console.log(`Location ${location.id} (${location.name}) photo:`, photoUrl);
                    
                    return (
                        <div
                            key={location.id}
                            className={`border rounded-lg overflow-hidden shadow-sm transition-all cursor-pointer ${
                                selectedLocationId === location.id
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:bg-gray-50'
                            }`}
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
                                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-xl">
                                                {getCategoryEmoji(location.category)}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-grow">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-medium text-lg">{location.name}</h3>
                                            {location.rating && (
                                                <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                                                    ★ {typeof location.rating === 'number' ? location.rating.toFixed(1) : location.rating}
                                                </div>
                                            )}
                                        </div>

                                        <p className="text-sm text-gray-500 mt-1">{location.address}</p>

                                        {/* Place photo - shows actual Google photo if available */}
                                        {photoUrl && (
                                            <div className="mt-3 mb-3 w-full h-36 relative rounded overflow-hidden">
                                                <img 
                                                    src={photoUrl} 
                                                    alt={location.name}
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute top-2 right-2 bg-white bg-opacity-75 rounded-full w-8 h-8 flex items-center justify-center text-gray-700 text-sm font-bold">
                                                    {index + 1}
                                                </div>
                                            </div>
                                        )}

                                        <div className="mt-2">
                                            <span className="inline-block bg-gray-100 rounded-full px-3 py-1 text-xs font-medium text-gray-700">
                                                {getCategoryEmoji(location.category)} {location.category}
                                            </span>
                                        </div>

                                        <p className="mt-2 text-sm text-gray-700">{location.description}</p>
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
