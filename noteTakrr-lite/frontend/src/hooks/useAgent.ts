/**
 * useAgent hook - Handles communication with the AI processing endpoint.
 */

export function useAgent() {
  // TODO: Implement agent communication hook
  // - POST /api/process with file and mode
  // - Handle loading/error states
  // - Return response data
  return {
    processNotes: async () => {},
    isProcessing: false,
    error: null,
  };
}

export default useAgent;
