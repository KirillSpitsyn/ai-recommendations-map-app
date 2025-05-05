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
        ? 'fixed inset-0 bg-background bg-opacity-80 flex items-center justify-center z-50 transition-colors duration-200'
        : 'w-full flex flex-col items-center justify-center p-8 border border-border rounded-lg bg-card-bg transition-colors duration-200';

    return (
        <div className={containerClasses}>
            <div className="flex flex-col items-center">
                <div className="relative">
                    <div className="h-16 w-16 rounded-full border-t-4 border-b-4 border-blue-500 animate-spin"></div>
                    <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-t-4 border-b-4 border-transparent border-r-4 border-l-4 border-blue-300 animate-ping"></div>
                </div>

                <div className="mt-4 text-center">
                    <p className="text-lg font-medium text-primary transition-colors duration-200">{message}</p>
                    {fullScreen && (
                        <p className="text-sm text-muted mt-2 transition-colors duration-200">
                            This may take a few moments...
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoadingState;
