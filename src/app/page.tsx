'use client';

import React, { useState } from 'react';
import HandleForm from '../components/HandleForm';
import PersonaCard from '../components/PersonaCard';
import LocationMap, { PlacePhotosContext } from '../components/LocationMap';
import LocationList from '../components/LocationList';
import LoadingState from '../components/LoadingState';
import { Persona } from '@/components/PersonaCard';
import { Location } from '@/components/LocationList';
import { GeneratePersonaResponse, GenerateLocationsResponse } from './types/api';

export default function Home() {
  // State variables
  const [persona, setPersona] = useState<Persona | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<string>('');
  const [userCoordinates, setUserCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [searchRadius, setSearchRadius] = useState<number>(10); // Default 10km
  const [placePhotos, setPlacePhotos] = useState<Record<string, string>>({});

// Handle form submission
const handleSubmit = async (xHandle: string, location: string) => {
  setIsLoading(true);
  setError(null);
  setPersona(null);
  setLocations([]);
  setSelectedLocationId(null);
  setCurrentLocation("Toronto, ON, Canada"); // Always set to Toronto
  setPlacePhotos({});

  // Setup a timeout to abort if request takes too long
  const timeoutDuration = 45000; // 45 seconds (increased from 30)
  const timeoutId = setTimeout(() => {
    if (isLoading) {
      setIsLoading(false);
      setError("Request timed out. Please try again later.");
    }
  }, timeoutDuration);

  // Helper function to retry fetch operations
  const retryFetch = async (url: string, options: any, maxRetries = 2): Promise<Response> => {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`Retry attempt ${attempt} for ${url}`);
          // Add a small delay before retrying
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
        const response = await fetch(url, options);
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`API error response (attempt ${attempt}):`, errorText);
          throw new Error(`API error: ${response.status}`);
        }
        return response;
      } catch (err) {
        console.error(`Fetch error (attempt ${attempt}):`, err);
        lastError = err;
        // Continue to next retry attempt
      }
    }
    throw lastError; // Throw the last error if all retries fail
  };

  try {
    // Step 1: Generate persona from X handle
    const personaResponse = await Promise.race([
      retryFetch('/api/persona', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ xHandle }),
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Persona request timed out')), timeoutDuration)
      )
    ]) as Response;

    let personaData: GeneratePersonaResponse;
    try {
      personaData = await personaResponse.json();
    } catch (error) {
      console.error('Failed to parse JSON response:', error);
      throw new Error('Invalid response format from API');
    }

    if (!personaData.success || !personaData.persona) {
      throw new Error(personaData.error || 'Failed to generate persona');
    }

    // Validate that persona data doesn't contain default placeholders
    if (personaData.persona.bio.includes("user x bio")) {
      personaData.persona.bio = `X user @${personaData.persona.handle} - Twitter content creator`;
    }

    // Set persona
    setPersona(personaData.persona);

    // Step 2: Get location recommendations based on persona
    const locationsResponse = await Promise.race([
      retryFetch('/api/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          persona: personaData.persona,
          location: "Toronto, ON, Canada", // Always use Toronto
        }),
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Locations request timed out')), timeoutDuration)
      )
    ]) as Response;

    let locationsData: GenerateLocationsResponse;
    try {
      locationsData = await locationsResponse.json();
    } catch (error) {
      console.error('Failed to parse JSON response:', error);
      throw new Error('Invalid response format from API');
    }

    if (!locationsData.success || !locationsData.locations) {
      throw new Error(locationsData.error || 'Failed to generate locations');
    }

    // Set locations
    setLocations(locationsData.locations);

    // Set Toronto coordinates
    setUserCoordinates({ lat: 43.6532, lng: -79.3832 });

  } catch (err) {
    console.error('Error in generation process:', err);
    const errorMessage = err instanceof Error ? 
      (err.message.includes('timed out') ? 'Request timed out. Please try again later.' : err.message) 
      : 'An unknown error occurred';
    setError(errorMessage);
  } finally {
    clearTimeout(timeoutId); // Clear the timeout
    setIsLoading(false);
  }
};

  // Handle location selection
  const handleLocationSelect = (locationId: string) => {
    setSelectedLocationId(locationId === selectedLocationId ? null : locationId);
  };

  return (
      <main className="min-h-screen bg-background py-4 transition-colors duration-200">
        <div className="container mx-auto px-4">
          <header className="mb-6 text-center">
            <h1 className="text-3xl font-bold mb-2 text-primary transition-colors duration-200">X Persona Toronto Finder</h1>
            <p className="text-primary transition-colors duration-200">
              Discover places in Toronto tailored to your X personality
            </p>
          </header>

          {/* Share photos state between components */}
          <PlacePhotosContext.Provider value={placePhotos}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Left Column - Handle Form and Persona Card */}
              <div className="lg:col-span-1">
                {/* Handle Form */}
                <HandleForm
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                    defaultLocation="Toronto, ON, Canada"
                />

                {/* Persona Card (when data is available) */}
                {(persona || isLoading || error) && (
                    <div className="mt-6">
                      <PersonaCard
                          persona={persona}
                          isLoading={isLoading}
                          error={error}
                      />
                    </div>
                )}
              </div>

              {/* Right Column - Location List */}
              <div className="lg:col-span-2">
                {isLoading ? (
                    <LoadingState message="Generating your personalized Toronto recommendations..." />
                ) : locations.length > 0 ? (
                    <div className="space-y-4">
                      <h2 className="text-2xl font-bold text-primary transition-colors duration-200">Your Toronto Recommendations</h2>
                      {/* Location List */}
                      <LocationList
                          locations={locations}
                          selectedLocationId={selectedLocationId}
                          onLocationSelect={handleLocationSelect}
                          profileImage={persona?.profileImageUrl}
                      />
                    </div>
                ) : persona ? (
                    <div className="bg-card-bg rounded-lg shadow-md p-6 flex items-center justify-center h-full border border-border transition-colors duration-200">
                      <p className="text-primary opacity-80 text-center transition-colors duration-200">
                        Waiting for Toronto recommendations...
                      </p>
                    </div>
                ) : (
                    <div className="bg-card-bg rounded-lg shadow-md p-6 border border-border transition-colors duration-200">
                      <h2 className="text-xl font-bold mb-4 text-primary transition-colors duration-200">How It Works</h2>
                      <ol className="list-decimal pl-5 space-y-2 text-primary">
                        <li>Enter your X handle (e.g., @username)</li>
                        <li>We'll analyze your X profile to understand your preferences</li>
                        <li>Get personalized location recommendations in Toronto</li>
                        <li>View an optimized route between the recommended locations</li>
                      </ol>
                      <div className="mt-4 p-3 bg-blue-500 bg-opacity-10 dark:bg-blue-900 dark:bg-opacity-20 rounded-md text-sm border border-blue-300 dark:border-blue-800">
                        <p className="flex items-center text-white transition-colors duration-200">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          Your privacy is important - we don't store your data or X handle.
                        </p>
                      </div>
                    </div>
                )}
              </div>
            </div>

            {/* Map now at the bottom - only show when we have locations */}
            {locations.length > 0 && (
              <div className="rounded-lg overflow-hidden shadow-lg mb-6 border border-border">
                <h2 className="text-2xl font-bold mb-2 text-primary transition-colors duration-200 p-4">Toronto Map</h2>
                <div style={{ height: '600px' }}>
                  <LocationMap
                    locations={locations}
                    selectedLocationId={selectedLocationId}
                    onLocationSelect={handleLocationSelect}
                    profileImage={persona?.profileImageUrl}
                    centerCoordinates={{ lat: 43.6532, lng: -79.3832 }} // Toronto coordinates
                  />
                </div>
              </div>
            )}
          </PlacePhotosContext.Provider>

          {/* Footer */}
          <footer className="mt-10 text-center text-primary text-sm pb-4 transition-colors duration-200">
            <p>
              This application uses your public X profile to generate Toronto recommendations.
              We do not store any of your data.
            </p>
          </footer>
        </div>
      </main>
  );
}
