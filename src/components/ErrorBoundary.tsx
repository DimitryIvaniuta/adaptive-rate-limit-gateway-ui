import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Last-resort UI boundary so one rendering failure does not blank the whole control plane.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Gateway UI render failure', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fatal-panel" role="alert">
          <h1>Gateway console failed to render</h1>
          <p>{this.state.error.message}</p>
          <button className="primary-button" type="button" onClick={() => window.location.reload()}>Reload console</button>
        </div>
      );
    }

    return this.props.children;
  }
}
