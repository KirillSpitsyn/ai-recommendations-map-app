'use client';

import React, { useState } from 'react';

interface HandleFormProps {
    onSubmit: (xHandle: string) => void;
    isLoading: boolean;
}

const HandleForm: React.FC<HandleFormProps> = ({ onSubmit, isLoading }) => {
    const [xHandle, setXHandle] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

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
        onSubmit(cleanHandle);
    };

    return (
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4 text-black">Generate Your Toronto Recommendations</h2>

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
                            className="pl-7 w-full p-2 border border-gray-700 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
                            placeholder="username"
                            disabled={isLoading}
                        />
                    </div>
                    {error && (
                        <p className="mt-1 text-sm text-red-600">{error}</p>
                    )}
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
            
            {/* How It Works section moved directly below the form */}
            <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="font-medium text-black mb-2">How It Works</h3>
                <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-600">
                    <li>Enter your X handle (e.g., @username)</li>
                    <li>We'll analyze your X profile to understand your preferences</li>
                    <li>Get personalized location recommendations in Toronto</li>
                    <li>View an optimized route between the recommended locations</li>
                </ol>
                <div className="mt-3 p-2 bg-blue-50 rounded-md text-xs text-blue-800">
                    <p className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        Your privacy is important - we don't store your data or X handle.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default HandleForm;
