'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, DirectionsRenderer, Libraries } from '@react-google-maps/api';
import { Location } from './LocationList';

// Define libraries as a constant array outside of the component
// This prevents the LoadScript component from reloading
const libraries: Libraries = ['places'];

// Create a photos context to share photos between components
export const PlacePhotosContext = React.createContext<Record<string, string>>({});

interface LocationMapProps {
    locations: Location[];
    selectedLocationId: string | null;
    onLocationSelect: (locationId: string) => void;
    profileImage?: string;
    centerCoordinates?: { lat: number; lng: number };
}

const LocationMap: React.FC<LocationMapProps> = ({
    locations,
    selectedLocationId,
    onLocationSelect,
    profileImage,
    centerCoordinates,
}) => {
    // Use useMemo to create a stable reference to the libraries array
    const libraries = useMemo(() => ['places'], []) as any;
    
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries
    });

    // Rest of your component remains the same
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>({ lat: 43.6532, lng: -79.3832 }); // Toronto coordinates
    const [circle, setCircle] = useState<google.maps.Circle | null>(null);
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
    const [placePhotos, setPlacePhotos] = useState<Record<string, string>>({});

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

    // Calculate center coordinates from locations if not provided
    useEffect(() => {
        if (locations.length > 0 && !centerCoordinates && !mapCenter) {
            const bounds = new google.maps.LatLngBounds();
            locations.forEach((location) => {
                bounds.extend(location.coordinates);
            });

            const center = {
                lat: (bounds.getNorthEast().lat() + bounds.getSouthWest().lat()) / 2,
                lng: (bounds.getNorthEast().lng() + bounds.getSouthWest().lng()) / 2,
            };

            setMapCenter(center);
        } else if (centerCoordinates) {
            setMapCenter(centerCoordinates);
        }
    }, [locations, centerCoordinates, mapCenter]);

    // Generate routes between locations - Restored implementation
    useEffect(() => {
        if (map && locations.length >= 2 && window.google?.maps?.DirectionsService) {
            try {
                console.log("Attempting to generate directions");
                const directionsService = new window.google.maps.DirectionsService();
                
                // Create waypoints from all locations except first and last
                const waypoints = locations.slice(1, locations.length - 1).map(location => ({
                    location: new google.maps.LatLng(location.coordinates.lat, location.coordinates.lng),
                    stopover: true
                }));
                
                const origin = new google.maps.LatLng(
                    locations[0].coordinates.lat, 
                    locations[0].coordinates.lng
                );
                
                const destination = new google.maps.LatLng(
                    locations[locations.length - 1].coordinates.lat, 
                    locations[locations.length - 1].coordinates.lng
                );
                
                console.log("Route parameters:", {
                    origin: `${origin.lat()},${origin.lng()}`,
                    destination: `${destination.lat()},${destination.lng()}`,
                    waypoints: waypoints.map(wp => `${wp.location.lat()},${wp.location.lng()}`),
                });
                
                directionsService.route({
                    origin: origin,
                    destination: destination,
                    waypoints: waypoints,
                    optimizeWaypoints: true,
                    travelMode: google.maps.TravelMode.DRIVING
                }, (result, status) => {
                    console.log("Directions result:", status);
                    if (status === google.maps.DirectionsStatus.OK) {
                        console.log("Setting directions");
                        setDirections(result);
                    } else {
                        console.error(`Error fetching directions: ${status}`);
                    }
                });
            } catch (error) {
                console.error("Error setting up directions:", error);
            }
        }
    }, [map, locations]);

    // Fetch place photos when map and locations are available
    useEffect(() => {
        if (map && locations.length > 0 && window.google?.maps?.places?.PlacesService) {
            console.log("Fetching place photos for locations:", locations.length);
            const placesService = new window.google.maps.places.PlacesService(map);
            
            // Process each location to get a photo
            locations.forEach(location => {
                // Skip if we already have a photo for this location
                if (placePhotos[location.id]) return;
                
                // Create a search request for this location
                const request = {
                    query: `${location.name} ${location.address}`,
                    fields: ['photos', 'name', 'formatted_address']
                };
                
                console.log(`Searching for place: ${location.name}`);
                
                // Search for the place
                placesService.findPlaceFromQuery(request, (results, status) => {
                    console.log(`Results for ${location.name}:`, status, results);
                    if (status === google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
                        // If the place has photos, get the first one
                        if (results[0].photos && results[0].photos.length > 0) {
                            const photoUrl = results[0].photos[0].getUrl({maxWidth: 400, maxHeight: 300});
                            console.log(`Found photo for ${location.name}:`, photoUrl);
                            
                            // Add the photo URL to our state
                            setPlacePhotos(prevPhotos => {
                                const newPhotos = {
                                    ...prevPhotos,
                                    [location.id]: photoUrl
                                };
                                console.log("Updated photos:", newPhotos);
                                return newPhotos;
                            });
                        } else {
                            // If no photos were found, we could try a different search
                            console.log(`No photos found for ${location.name}, trying category search`);
                            // For example, just search for the category + location
                            const categoryRequest = {
                                query: `${location.category} in Toronto`,
                                fields: ['photos']
                            };
                            
                            placesService.findPlaceFromQuery(categoryRequest, (categoryResults, categoryStatus) => {
                                console.log(`Category search results for ${location.category}:`, categoryStatus, categoryResults);
                                if (categoryStatus === google.maps.places.PlacesServiceStatus.OK && 
                                    categoryResults && 
                                    categoryResults[0] && 
                                    categoryResults[0].photos) {
                                    
                                    const categoryPhotoUrl = categoryResults[0].photos[0].getUrl({maxWidth: 400, maxHeight: 300});
                                    console.log(`Found category photo for ${location.name}:`, categoryPhotoUrl);
                                    
                                    setPlacePhotos(prevPhotos => ({
                                        ...prevPhotos,
                                        [location.id]: categoryPhotoUrl
                                    }));
                                }
                            });
                        }
                    }
                });
            });
        }
    }, [map, locations]);

    const onLoad = useCallback((map: google.maps.Map) => {
        console.log("Map loaded");
        // Create a circle for Toronto with 10km radius
        const torontoCircle = new google.maps.Circle({
            strokeColor: '#2563EB',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#3B82F6',
            fillOpacity: 0.1,
            map,
            center: { lat: 43.6532, lng: -79.3832 }, // Toronto
            radius: 10000, // 10km in meters
        });
        setCircle(torontoCircle);

        // Fit map to show all markers or default to Toronto area
        if (locations.length > 0) {
            const bounds = new google.maps.LatLngBounds();
            locations.forEach((location) => {
                bounds.extend(location.coordinates);
            });
            map.fitBounds(bounds);
        } else {
            map.setCenter({ lat: 43.6532, lng: -79.3832 });
            map.setZoom(12);
        }

        setMap(map);
    }, [locations]);

    const onUnmount = useCallback(() => {
        setMap(null);
        if (circle) {
            circle.setMap(null);
            setCircle(null);
        }
    }, [circle]);

    const handleMarkerClick = (locationId: string) => {
        onLocationSelect(locationId);

        // Center map on the selected location
        const selectedLocation = locations.find(loc => loc.id === locationId);
        if (selectedLocation && map) {
            map.panTo(selectedLocation.coordinates);
            map.setZoom(15); // Zoom in a bit
        }
    };

    // Get category emoji for display
    const getCategoryEmoji = (category: string): string => {
        const icons: Record<string, string> = {
            restaurant: '🍽️',
            cafe: '☕',
            bar: '🍸',
            park: '🌳',
            museum: '🏛️',
            shop: '🛍️',
            shopping: '🛍️',
            entertainment: '🎭',
            attraction: '🏙️',
            sports: '🏃',
            fitness: '💪',
            education: '📚',
            art: '🎨',
            music: '🎵',
            outdoor: '🏞️',
            default: '📍'
        };
        
        return icons[category.toLowerCase()] || icons.default;
    };

    // Custom marker with larger size and profile image
    const createCustomMarker = (location: Location, isSelected: boolean): google.maps.Symbol | google.maps.Icon => {
        // Use profile image for all markers if available
        if (profileImage) {
            return {
                url: profileImage,
                scaledSize: new google.maps.Size(isSelected ? 70 : 60, isSelected ? 70 : 60),
                origin: new google.maps.Point(0, 0),
                anchor: new google.maps.Point(35, 35),
            };
        }
        
        // Default marker based on category
        const colors: Record<string, string> = {
            restaurant: '#FF5252',
            cafe: '#FFAB40',
            bar: '#7C4DFF',
            park: '#66BB6A',
            museum: '#FFC107',
            shopping: '#EC407A',
            shop: '#EC407A',
            entertainment: '#448AFF',
            attraction: '#8E24AA',
            sports: '#26A69A',
            fitness: '#EF5350',
            education: '#5C6BC0',
            art: '#AB47BC',
            music: '#26C6DA',
            outdoor: '#9CCC65',
            default: '#757575'
        };
        
        const color = colors[location.category.toLowerCase()] || colors.default;
        
        return {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: color,
            fillOpacity: 0.9,
            strokeWeight: 2,
            strokeColor: '#FFFFFF',
            scale: isSelected ? 22 : 18, // Even larger pins
        };
    };

    if (loadError) {
        return (
            <div className="h-screen bg-red-50 flex items-center justify-center rounded-lg">
                <p className="text-red-500">Error loading Google Maps: {loadError.message}</p>
            </div>
        );
    }

    if (!isLoaded || !mapCenter) {
        return (
            <div className="h-screen bg-gray-100 flex items-center justify-center rounded-lg">
                <p className="text-gray-500">Loading map...</p>
            </div>
        );
    }

    return (
        <PlacePhotosContext.Provider value={placePhotos}>
            <div className="rounded-lg overflow-hidden shadow-md">
                <div className="h-[600px]">
                    <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '100%' }}
                        center={mapCenter || { lat: 43.6532, lng: -79.3832 }} // Default to Toronto
                        zoom={12}
                        onLoad={onLoad}
                        onUnmount={onUnmount}
                        options={{
                            disableDefaultUI: false,
                            zoomControl: true,
                            streetViewControl: true,
                            fullscreenControl: true,
                            mapTypeControl: true,
                            styles: [
                                {
                                    featureType: 'poi',
                                    elementType: 'labels',
                                    stylers: [{ visibility: 'off' }]
                                }
                            ]
                        }}
                    >
                        {/* Render directions if available */}
                        {directions && (
                            <DirectionsRenderer
                                directions={directions}
                                options={{
                                    suppressMarkers: true, // Don't show default markers
                                    polylineOptions: {
                                        strokeColor: '#3B82F6', // Blue route line
                                        strokeWeight: 5,
                                        strokeOpacity: 0.7
                                    }
                                }}
                            />
                        )}
                        
                        {/* Render custom markers */}
                        {locations.map((location, index) => (
                            <Marker
                                key={location.id}
                                position={location.coordinates}
                                onClick={() => handleMarkerClick(location.id)}
                                icon={createCustomMarker(location, selectedLocationId === location.id)}
                                animation={selectedLocationId === location.id ? google.maps.Animation.BOUNCE : undefined}
                                label={{
                                    text: (index + 1).toString(),
                                    color: 'white',
                                    fontWeight: 'bold'
                                }}
                            >
                                {selectedLocationId === location.id && (
                                    <InfoWindow onCloseClick={() => onLocationSelect('')}>
                                        <div className="p-3 max-w-sm">
                                            <h3 className="text-lg text-primary">{location.name}</h3>
                                            <p className="text-sm text-gray-600 mb-2">{location.address}</p>
                                            {placePhotos[location.id] ? (
                                                <div className="mb-2 relative h-48 w-full overflow-hidden rounded">
                                                    <img 
                                                        src={placePhotos[location.id]}
                                                        alt={location.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="mb-2 bg-gray-100 rounded-lg p-4 flex items-center justify-center" style={{height: '12rem'}}>
                                                    <span className="text-6xl">{getCategoryEmoji(location.category)}</span>
                                                </div>
                                            )}
                                            <p className="text-sm text-gray-700 my-2">{location.description}</p>
                                            <div className="mt-2 flex items-center justify-between">
                                                <span className="inline-block bg-gray-100 rounded-full px-3 py-1 text-xs font-medium text-gray-700">
                                                    {location.category}
                                                </span>
                                                {location.rating && (
                                                    <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                                                        ★ {location.rating.toFixed(1)}
                                                    </span>
                                                )}
                                            </div>
                                            {isValidWebsite(location.website) && (
                                                <div className="mt-3">
                                                    <a 
                                                        href={location.website}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center justify-center w-full bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium py-2 px-3 rounded transition-colors"
                                                    >
                                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                        </svg>
                                                        Visit Website
                                                    </a>
                                                </div>
                                            )}
                                            <div className="mt-2 text-xs text-gray-500">
                                                Location #{index + 1} in Toronto
                                            </div>
                                        </div>
                                    </InfoWindow>
                                )}
                            </Marker>
                        ))}
                    </GoogleMap>
                </div>
            </div>
        </PlacePhotosContext.Provider>
    );
};

export default LocationMap;
