import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { NotebookPen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Notely — your notes, always with you" },
      {
        name: "description",
        content: "A simple note-taking app. Sign up, write notes, and find them waiting whenever you return.",
      },
      { property: "og:title", content: "Notely — your notes, always with you" },
      {
        property: "og:description",
        content: "A simple note-taking app. Sign up, write notes, and find them waiting whenever you return.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/notes", replace: true });
    });
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="flex max-w-md flex-col items-center text-center">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <NotebookPen className="h-7 w-7" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Notely</h1>
        <p className="mt-3 text-muted-foreground">
          A simple place for your thoughts. Create an account, write notes, and
          pick up right where you left off — on any device.
        </p>
        <div className="mt-8 flex gap-3">
          <Button asChild>
            <Link to="/auth">Get started</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
