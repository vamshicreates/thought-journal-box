import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Trash2, Plus, LogOut, Save, Check, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  listNotes,
  createNote,
  updateNote,
  deleteNote,
  type Note,
} from "@/lib/notes.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/notes")({
  head: () => ({
    meta: [
      { title: "Your notes · Notely" },
      { name: "description", content: "Create and manage your personal notes." },
      { property: "og:title", content: "Your notes · Notely" },
      { property: "og:description", content: "Create and manage your personal notes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotesPage,
});

function NotesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = Route.useRouteContext() as { user?: { email?: string } } & Record<string, unknown>;

  const fetchNotes = useServerFn(listNotes);
  const createNoteFn = useServerFn(createNote);
  const updateNoteFn = useServerFn(updateNote);
  const deleteNoteFn = useServerFn(deleteNote);

  const { data: notes = [] } = useQuery<Note[]>({
    queryKey: ["notes"],
    queryFn: () => fetchNotes(),
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const selected = notes.find((n) => n.id === selectedId) ?? null;
  const isDirty = Boolean(
    selected && (title !== selected.title || body !== selected.body),
  );

  useEffect(() => {
    if (selected) {
      setTitle(selected.title);
      setBody(selected.body);
    }
  }, [selectedId, selected?.id]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["notes"] });

  const createMutation = useMutation({
    mutationFn: () => createNoteFn({ data: { title: "Untitled note", body: "" } }),
    onSuccess: (note) => {
      invalidate();
      setSelectedId(note.id);
    },
  });

  const saveMutation = useMutation({
    mutationFn: (vars: { id: string; title: string; body: string }) =>
      updateNoteFn({ data: vars }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNoteFn({ data: { id } }),
    onSuccess: (_d, id) => {
      invalidate();
      if (selectedId === id) {
        setSelectedId(null);
        setTitle("");
        setBody("");
      }
    },
  });

  // Autosave edits (debounced)
  useEffect(() => {
    if (!selected) return;
    if (title === selected.title && body === selected.body) return;
    const t = setTimeout(() => {
      saveMutation.mutate({ id: selected.id, title, body });
    }, 600);
    return () => clearTimeout(t);
  }, [title, body, selected?.id]);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <span className="text-lg font-semibold">Notely</span>
        <div className="flex items-center gap-3">
          {user?.email && (
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user.email}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-1 h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6 md:flex-row">
        <aside className="w-full md:w-72 md:shrink-0">
          <Button
            className="mb-4 w-full"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            <Plus className="mr-1 h-4 w-4" /> New note
          </Button>
          <div className="flex flex-col gap-2">
            {notes.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No notes yet — create your first one.
              </p>
            )}
            {notes.map((note) => (
              <button
                key={note.id}
                onClick={() => setSelectedId(note.id)}
                className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  note.id === selectedId
                    ? "border-primary bg-accent"
                    : "border-border bg-card hover:bg-accent/50"
                }`}
              >
                <div className="truncate font-medium">{note.title || "Untitled note"}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {note.body || "No content"}
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1">
          {selected ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                <CardTitle className="sr-only">Edit note</CardTitle>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Note title"
                  className="text-lg font-semibold"
                />
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Save note"
                    disabled={!isDirty || saveMutation.isPending}
                    onClick={() =>
                      saveMutation.mutate({ id: selected.id, title, body })
                    }
                  >
                    <Save className="mr-1 h-4 w-4" />
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete note"
                    onClick={() => deleteMutation.mutate(selected.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Start writing…"
                  className="min-h-[40vh] resize-y"
                />
                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  {saveMutation.isPending ? (
                    <>Saving…</>
                  ) : isDirty ? (
                    <>
                      <Pencil className="h-3 w-3" /> Unsaved changes
                    </>
                  ) : (
                    <>
                      <Check className="h-3 w-3" /> Saved
                    </>
                  )}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex h-full min-h-[40vh] items-center justify-center rounded-md border border-dashed border-border">
              <p className="text-sm text-muted-foreground">
                Select a note or create a new one to start writing.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
