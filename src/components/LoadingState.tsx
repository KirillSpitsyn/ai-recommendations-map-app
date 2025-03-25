import React from 'react';

interface LoadingStateProps {
    message?: string;
    fullScreen?: boolean;
}

const LoadingState: React.FC<LoadingStateProps> = ({
                                                       message = 'Loading...',
                                                       fullScreen = false
                                                   }) => {
    const containerClasses = fullScreen
        ? 'fixed inset-0 bg-white bg-opacity-80 flex items-center justify-center z-50'
        : 'w-full flex flex-col items-center justify-center p-8';

    return (
        <div className={containerClasses}>
            <div className="flex flex-col items-center">
                <div className="relative">
                    <div className="h-16 w-16 rounded-full border-t-4 border-b-4 border-blue-500 animate-spin"></div>
                    <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-t-4 border-b-4 border-transparent border-r-4 border-l-4 border-blue-300 animate-ping"></div>
                </div>

                <div className="mt-4 text-center">
                    <p className="text-lg font-medium text-gray-700">{message}</p>
                    {fullScreen && (
                        <p className="text-sm text-gray-500 mt-2">
                            This may take a few moments...
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoadingState;