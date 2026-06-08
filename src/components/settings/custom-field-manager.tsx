'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Plus, X, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useCan } from '@/hooks/use-can';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { CustomField } from '@/types';

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'url', label: 'URL' },
] as const;

export function CustomFieldManager() {
  const supabase = createClient();
  const { user, accountId, profileLoading, loading: authLoading } = useAuth();
  const canEdit = useCan('edit-settings');

  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<CustomField | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<string>('text');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    fetchFields();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  async function fetchFields() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('custom_fields')
        .select('*')
        .order('field_name');

      if (error) throw error;
      setFields(data ?? []);
    } catch (err) {
      console.error('Failed to fetch custom fields:', err);
      toast.error('Failed to load custom fields');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!fieldName.trim()) {
      toast.error('Field name is required');
      return;
    }

    try {
      setSaving(true);
      if (!user) {
        toast.error('Not authenticated');
        return;
      }
      if (profileLoading || !accountId) {
        toast.error('Account still loading — try again in a moment.');
        return;
      }

      const { error } = await supabase.from('custom_fields').insert({
        user_id: user.id,
        account_id: accountId,
        field_name: fieldName.trim(),
        field_type: fieldType,
      });

      if (error) throw error;

      toast.success('Custom field created');
      setDialogOpen(false);
      setFieldName('');
      setFieldType('text');
      await fetchFields();
    } catch (err) {
      console.error('Create custom field error:', err);
      toast.error('Failed to create custom field');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(field: CustomField) {
    setFieldToDelete(field);
    setDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (!fieldToDelete) return;

    try {
      setDeleting(true);
      const { error } = await supabase
        .from('custom_fields')
        .delete()
        .eq('id', fieldToDelete.id);

      if (error) throw error;

      toast.success('Custom field deleted');
      setFields((prev) => prev.filter((f) => f.id !== fieldToDelete.id));
      setDeleteDialogOpen(false);
      setFieldToDelete(null);
    } catch (err) {
      console.error('Delete custom field error:', err);
      toast.error('Failed to delete custom field');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Custom Fields</h2>
          <p className="text-sm text-slate-400">
            Add extra data fields to contacts for broadcasts and filtering.
          </p>
          {!canEdit && (
            <p className="text-xs text-slate-500 mt-1">
              Only admins can create or delete custom fields.
            </p>
          )}
        </div>
        {canEdit && (
          <Button
            onClick={() => {
              setFieldName('');
              setFieldType('text');
              setDialogOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
          >
            <Plus className="size-4" />
            New Field
          </Button>
        )}
      </div>

      {fields.length === 0 ? (
        <Card className="bg-slate-900 border-slate-700 ring-0 ring-transparent">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-slate-400 text-sm">No custom fields yet.</p>
            <p className="text-slate-500 text-xs mt-1">
              {canEdit
                ? 'Create fields like "City", "Membership tier", or "Lead source".'
                : 'Ask an admin to create custom fields for your account.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-slate-900 border-slate-700 ring-0 ring-transparent">
          <CardContent className="pt-4">
            <div className="divide-y divide-slate-800">
              {fields.map((field) => (
                <div
                  key={field.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{field.field_name}</p>
                    <p className="text-xs text-slate-500 capitalize">{field.field_type}</p>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => confirmDelete(field)}
                      className="rounded-md p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                      title="Delete field"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">New Custom Field</DialogTitle>
            <DialogDescription className="text-slate-400">
              This field will appear on contact profiles and in broadcast filters.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-slate-300">Field Name</Label>
              <Input
                placeholder="e.g. City"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Field Type</Label>
              <select
                value={fieldType}
                onChange={(e) => setFieldType(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white"
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="bg-slate-900 border-slate-700">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Field'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Custom Field</DialogTitle>
            <DialogDescription className="text-slate-400">
              Delete &quot;{fieldToDelete?.field_name}&quot;? Values saved on contacts will
              also be removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-slate-900 border-slate-700">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Field'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Inline link for empty states in broadcasts / contacts. */
export function CustomFieldsSettingsLink() {
  return (
    <Link href="/settings?tab=custom-fields" className="text-primary hover:underline">
      Settings → Custom Fields
    </Link>
  );
}
