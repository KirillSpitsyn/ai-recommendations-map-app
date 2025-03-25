'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface HandleFormProps {
    onSubmit: (xHandle: string, location: string) => void;
    isLoading: boolean;
    defaultLocation?: string;
}

const HandleForm: React.FC<HandleFormProps> = ({ onSubmit, isLoading, defaultLocation }) => {
    const [xHandle, setXHandle] = useState<string>('');
    const [location, setLocation] = useState<string>(defaultLocation || '');
    const [error, setError] = useState<string | null>(null);

    // Update location if defaultLocation changes
    useEffect(() => {
        if (defaultLocation) {
            setLocation(defaultLocation);
        }
    }, [defaultLocation]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        if (!xHandle.trim()) {
            setError('Please enter your X handle');
            return;
        }

        // Clear any previous errors
        setError(null);

        // Remove @ symbol if user included it
        const cleanHandle = xHandle.trim().replace(/^@/, '');

        // Always use Toronto as the location
        const torontoLocation = "Toronto, ON, Canada";
        setLocation(torontoLocation);
        onSubmit(cleanHandle, torontoLocation);
    };

    return (
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Generate Your Toronto Recommendations</h2>

            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label htmlFor="xHandle" className="block text-sm font-medium text-gray-700 mb-1">
                        X Handle
                    </label>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">@</span>
                        <input
                            type="text"
                            id="xHandle"
                            value={xHandle}
                            onChange={(e) => setXHandle(e.target.value)}
                            className="pl-7 w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            placeholder="username"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="mb-4">
                    <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium text-gray-700">
              Location: Toronto, ON, Canada
            </span>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-2 text-sm text-red-700 bg-red-100 rounded-md">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
                    ) : (
                        'Find My Toronto Spots'
                    )}
                </button>
            </form>
        </div>
    );
};

export default HandleForm;