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
        <div className="space-y-4 mb-6">
            <h2 className="text-xl text-black">Recommended Locations</h2>
            <p className="text-sm text-black mb-4">Based on your X persona profile</p>

            <div className="space-y-2">
                {locations.map((location, index) => {
                    const photoUrl = placePhotos?.[location.id];
                    
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
                            <div className="p-3">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 mr-3">
                                        <div 
                                            className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-lg"
                                            style={{minWidth: '2rem'}}
                                        >
                                            {index + 1}
                                        </div>
                                    </div>

                                    <div className="flex-grow min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-medium text-black truncate pr-2">{location.name}</h3>
                                            {location.rating && (
                                                <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
                                                    ★ {typeof location.rating === 'number' ? location.rating.toFixed(1) : location.rating}
                                                </div>
                                            )}
                                        </div>

                                        <p className="text-xs text-gray-500 mt-1 truncate">{location.address}</p>

                                        {/* Condensed place description - max 2 lines */}
                                        <p className="mt-2 text-xs text-gray-700 line-clamp-2">{location.description}</p>

                                        <div className="mt-2 flex items-center justify-between">
                                            <span className="inline-block bg-gray-100 rounded-full px-2 py-1 text-xs font-medium text-gray-700">
                                                {getCategoryEmoji(location.category)} {location.category}
                                            </span>
                                            
                                            {/* Only show photo thumbnail if available */}
                                            {photoUrl && (
                                                <div className="w-12 h-12 rounded overflow-hidden ml-2 flex-shrink-0">
                                                    <img 
                                                        src={photoUrl} 
                                                        alt={location.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            )}
                                        </div>
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
