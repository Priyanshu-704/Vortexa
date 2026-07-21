import React, { createContext, useContext, useState, useEffect } from 'react';

// Router context type
interface RouterContextType {
  location: string;
  navigate: (to: string, options?: { replace?: boolean }) => void;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

interface BrowserRouterProps {
  children: React.ReactNode;
}

export function BrowserRouter({ children }: BrowserRouterProps) {
  const [location, setLocation] = useState(window.location.pathname);

  const navigate = (to: string, options?: { replace?: boolean }) => {
    if (options?.replace) {
      window.history.replaceState(null, '', to);
    } else {
      window.history.pushState(null, '', to);
    }
    setLocation(to);
  };

  useEffect(() => {
    const handlePopState = () => {
      setLocation(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <RouterContext.Provider value={{ location, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useLocation must be used within a BrowserRouter');
  }
  return { pathname: context.location };
}

export function useNavigate() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useNavigate must be used within a BrowserRouter');
  }
  return context.navigate;
}

interface RouteProps {
  path: string;
  element: React.ReactNode;
}

export function Routes({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  let match: React.ReactElement<RouteProps> | null = null;
  let fallback: React.ReactElement<RouteProps> | null = null;

  React.Children.forEach(children, (child) => {
    if (React.isValidElement<RouteProps>(child)) {
      const { path } = child.props;
      if (path === pathname) {
        match = child;
      } else if (path === '*') {
        fallback = child;
      }
    }
  });

  const matchedRoute = match || fallback;
  return matchedRoute ? <>{matchedRoute.props.element}</> : null;
}

export function Route({ path: _path, element }: RouteProps) {
  return <>{element}</>;
}

interface LinkProps {
  to: string;
  children: React.ReactNode;
  [key: string]: any;
}

export function Link({ to, children, ...props }: LinkProps) {
  const navigate = useNavigate();
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(to);
  };

  return (
    <a href={to} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}

interface NavigateProps {
  to: string;
  replace?: boolean;
}

export function Navigate({ to, replace }: NavigateProps) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to, { replace });
  }, [to, replace, navigate]);

  return null;
}
