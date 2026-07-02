import { ClerkProvider } from "@clerk/clerk-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StarterShell } from "@/components/starter/StarterShell";
import "./App.css";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function App() {
  if (!clerkPubKey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Missing Clerk Configuration</CardTitle>
            <CardDescription>
              Set <code>VITE_CLERK_PUBLISHABLE_KEY</code> in <code>client/.env</code>{" "}
              and restart the Vite dev server.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <StarterShell />
    </ClerkProvider>
  );
}

export default App;
