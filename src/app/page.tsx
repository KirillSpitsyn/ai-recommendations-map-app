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
  const [placePhotos, setPlacePhotos] = useState<Record<string, string>>({});

  // Handle form submission
  const handleSubmit = async (xHandle: string) => {
    setIsLoading(true);
    setError(null);
    setPersona(null);
    setLocations([]);
    setSelectedLocationId(null);
    setPlacePhotos({});

    try {
      // Step 1: Generate persona from X handle
      const personaResponse = await fetch('/api/persona', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ xHandle }),
      });

      if (!personaResponse.ok) {
        const errorText = await personaResponse.text();
        console.error('API error response:', errorText);
        throw new Error(`API error: ${personaResponse.status}`);
      }

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

      // Fix "Unknown User" issue - ensure a name is set
      if (personaData.persona.name === 'Unknown User' && personaData.persona.handle) {
        personaData.persona.name = personaData.persona.handle;
      }

      // Set persona
      setPersona(personaData.persona);

      // Step 2: Get location recommendations based on persona
      const locationsResponse = await fetch('/api/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          persona: personaData.persona,
          location: "Toronto, ON, Canada", // Always use Toronto
        }),
      });

      if (!locationsResponse.ok) {
        const errorText = await locationsResponse.text();
        console.error('API error response:', errorText);
        throw new Error(`API error: ${locationsResponse.status}`);
      }

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

      // Prevent duplicate locations by filtering based on name
      const uniqueLocations = locationsData.locations.reduce((acc: Location[], current) => {
        const x = acc.find(item => item.name === current.name);
        if (!x) {
          // Shorten descriptions to 1-2 sentences (split by period and take first 1-2)
          const sentences = current.description.split('.').filter(s => s.trim().length > 0);
          const shortDescription = sentences.slice(0, 2).join('.') + '.';
          return [...acc, {...current, description: shortDescription}];
        }
        return acc;
      }, []);

      // Set locations
      setLocations(uniqueLocations);

    } catch (err) {
      console.error('Error in generation process:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle location selection
  const handleLocationSelect = (locationId: string) => {
    setSelectedLocationId(locationId === selectedLocationId ? null : locationId);
  };

  return (
    <main className="min-h-screen bg-gray-50 py-4">
      <div className="container mx-auto px-4">
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-bold mb-2">X Persona Toronto Finder</h1>
          <p className="text-gray-600">
            Discover places in Toronto tailored to your X personality
          </p>
        </header>

        {/* Search form at the top */}
        <div className="mb-6">
          <HandleForm
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </div>

        {/* Share photos state between components */}
        <PlacePhotosContext.Provider value={placePhotos}>
          {/* Conditional layout based on whether we have results */}
          {!persona && !isLoading ? (
            // Initial layout with centered map
            <div className="mb-6">
              <div className="bg-white rounded-lg shadow-md p-6 flex items-center justify-center" style={{height: '400px'}}>
                <div className="text-center">
                  <div className="text-6xl mb-4">🗺️</div>
                  <p className="text-gray-600 max-w-md">
                    Enter your X handle above to discover personalized Toronto locations based on your online personality
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // Layout with results: map and list side by side
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                {/* Persona Card (when data is available) */}
                {(persona || isLoading || error) && (
                  <div className="mb-6">
                    <PersonaCard
                      persona={persona}
                      isLoading={isLoading}
                      error={error}
                    />
                  </div>
                )}

                {/* Location List */}
                {!isLoading && locations.length > 0 && (
                  <div className="space-y-4">
                    <LocationList
                      locations={locations}
                      selectedLocationId={selectedLocationId}
                      onLocationSelect={handleLocationSelect}
                      profileImage={persona?.profileImageUrl}
                    />
                  </div>
                )}
              </div>

              <div className="lg:col-span-2">
                {isLoading ? (
                  <LoadingState message="Generating your personalized Toronto recommendations..." />
                ) : locations.length > 0 ? (
                  <div className="rounded-lg overflow-hidden shadow-lg" style={{ height: '600px' }}>
                    <LocationMap
                      locations={locations}
                      selectedLocationId={selectedLocationId}
                      onLocationSelect={handleLocationSelect}
                      profileImage={persona?.profileImageUrl}
                      centerCoordinates={{ lat: 43.6532, lng: -79.3832 }} // Toronto coordinates
                    />
                  </div>
                ) : persona ? (
                  <div className="bg-white rounded-lg shadow-md p-6 flex items-center justify-center h-full">
                    <p className="text-gray-500 text-center">
                      Waiting for Toronto recommendations...
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </PlacePhotosContext.Provider>

        {/* Footer */}
        <footer className="mt-10 text-center text-gray-500 text-sm pb-4">
          <p>
            This application uses your public X profile to generate Toronto recommendations.
            We do not store any of your data.
          </p>
        </footer>
      </div>
    </main>
  );
}
