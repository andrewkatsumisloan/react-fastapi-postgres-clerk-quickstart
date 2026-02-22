import { useState, useEffect } from "react";
import {
  ClerkProvider,
  SignInButton,
  UserButton,
  useUser,
  useClerk,
} from "@clerk/clerk-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Server,
  Cloud,
  Code,
  Layers,
  GitBranch,
} from "lucide-react";
import "./App.css";
import { API_BASE_URL } from "./config";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Backend info interface
interface BackendInfo {
  name: string;
  version: string;
  stack: {
    framework: string;
    database: string;
    deployment: string;
  };
}

function LandingContent() {
  const { isLoaded, isSignedIn, user } = useUser();
  const clerk = useClerk();
  const [backendInfo, setBackendInfo] = useState<BackendInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchBackendInfo = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/info`);
        const data = await response.json();
        setBackendInfo(data);
      } catch (error) {
        console.error("Error fetching backend info:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBackendInfo();
  }, []);

  // Fetch user profile when signed in to trigger user creation
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!isSignedIn || !user) return;

      try {
        const token = await clerk.session?.getToken();

        if (!token) {
          console.error("No token available");
          return;
        }

        // Simple request with just the Authorization header
        const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          await response.json();
        } else {
          console.error("Failed to fetch user profile:", response.status);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    if (isSignedIn && user) {
      fetchUserProfile();
    }
  }, [isSignedIn, user, clerk.session]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading user...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Layers className="h-6 w-6" />
            <span className="font-bold text-lg">
              Fullstack React, FastAPI, Postgres
            </span>
          </div>
          <div className="flex items-center gap-4">
            {isSignedIn ? (
              <UserButton />
            ) : (
              <SignInButton mode="modal">
                <Button>Sign In</Button>
              </SignInButton>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero section */}
        <section className="container py-24 space-y-8 md:space-y-16">
          <div className="flex flex-col items-center text-center space-y-4">
            <Badge className="my-6">Production Ready</Badge>
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
              Fullstack AWS Template
            </h1>
            <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed">
              A modern, scalable template for building web applications with
              React, FastAPI, and AWS.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
              <Button size="lg" className="gap-1">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline">
                Documentation
              </Button>
            </div>
          </div>
        </section>

        {/* Features section */}
        <section className="container py-16 space-y-16">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 my-4">
            <Card>
              <CardHeader>
                <Code className="h-6 w-6 mb-2 text-primary" />
                <CardTitle>Frontend Stack</CardTitle>
                <CardDescription>
                  Modern, responsive UI with the latest React
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">React 19</Badge>
                  <Badge variant="outline">TypeScript</Badge>
                  <Badge variant="outline">Vite</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Built with shadcn/ui components, Clerk Authentication, and
                  Tailwind CSS.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Server className="h-6 w-6 mb-2 text-primary" />
                <CardTitle>Backend Stack</CardTitle>
                <CardDescription>Powerful API with Python</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">
                    Loading backend info...
                  </p>
                ) : backendInfo ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {backendInfo.stack.framework}
                      </Badge>
                      <Badge variant="outline">
                        {backendInfo.stack.database}
                      </Badge>
                      <Badge variant="outline">Python 3.11</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Fast, async API endpoints with comprehensive
                      documentation.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Could not connect to backend
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Cloud className="h-6 w-6 mb-2 text-primary" />
                <CardTitle>Deployment</CardTitle>
                <CardDescription>Cloud-ready infrastructure</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Docker</Badge>
                  <Badge variant="outline">AWS</Badge>
                  <Badge variant="outline">CI/CD</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Containerized setup with infrastructure as code and automated
                  deployment pipelines.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Welcome section for authenticated users */}
        {isSignedIn && (
          <section className="container py-16">
            <Card className="my-4 border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-xl ">
                  Welcome, {user.firstName || user.username}!
                </CardTitle>
                <CardDescription>
                  You're now authenticated with Clerk
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage
                      src={user.imageUrl}
                      alt={user.username || ""}
                    />
                    <AvatarFallback>
                      {user.firstName?.charAt(0) || user.username?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {user.fullName || user.username}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {user.primaryEmailAddress?.emailAddress}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Getting started section */}
        <section className="container py-16 space-y-8">
          <div className="flex flex-col items-center gap-4 text-center my-8">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
              Getting Started
            </h2>
            <p className="max-w-[700px] text-muted-foreground md:text-lg/relaxed">
              This template includes Docker setup for both development and
              production environments.
            </p>
          </div>
          <Card className="my-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Development Workflow
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Check the README for detailed instructions on deployment and
                customization. This template is designed to get you up and
                running quickly with best practices.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm">
                  View Documentation
                </Button>
                <Button variant="outline" size="sm">
                  GitHub Repository
                </Button>
                <Button variant="outline" size="sm">
                  Report Issues
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t py-6 md:py-8">
        <div className="container flex flex-col items-center justify-center gap-4 md:flex-row md:justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
              Fullstack Template - Created with React, FastAPI, and AWS
            </p>
          </div>
          <div className="flex gap-4">
            <Button variant="ghost" size="icon">
              <GitBranch className="h-4 w-4" />
              <span className="sr-only">GitHub</span>
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  if (!clerkPubKey) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-xl w-full">
          <CardHeader>
            <CardTitle>Missing Clerk Configuration</CardTitle>
            <CardDescription>
              Set <code>VITE_CLERK_PUBLISHABLE_KEY</code> in <code>client/.env</code>{" "}
              (or <code>client/.env.local</code>) and restart the Vite dev
              server.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <LandingContent />
    </ClerkProvider>
  );
}

export default App;
