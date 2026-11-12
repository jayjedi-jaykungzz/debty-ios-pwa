import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Trash2, Archive, ArchiveRestore, Tag as TagIcon, Plus } from 'lucide-react';
import { Person, Tag } from '../types/debty';
import { useDebty } from '../context/DebtyContext';
import { IOS_AVATAR_PALETTE } from '../utils/colors';
import { Avatar } from './common/Avatar';

interface PersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  personToEdit?: Person | null;
}

export const PersonModal: React.FC<PersonModalProps> = ({ isOpen, onClose, personToEdit }) => {
  const { addPerson, updatePerson, deletePerson, archivePerson, tags, addTag } = useDebty();

  const [name, setName] = useState<string>('');
  const [avatarColor, setAvatarColor] = useState<string>(IOS_AVATAR_PALETTE[0].hex);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isCreatingTag, setIsCreatingTag] = useState<boolean>(false);
  const [newTagName, setNewTagName] = useState<string>('');
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);

  const isEditing = Boolean(personToEdit);

  useEffect(() => {
    if (personToEdit) {
      setName(personToEdit.name);
      setAvatarColor(personToEdit.avatarColor || IOS_AVATAR_PALETTE[0].hex);
      setSelectedTagIds(personToEdit.tagIds || []);
    } else {
      setName('');
      // Randomly pick a vibrant default avatar color
      const randomColor = IOS_AVATAR_PALETTE[Math.floor(Math.random() * IOS_AVATAR_PALETTE.length)].hex;
      setAvatarColor(randomColor);
      setSelectedTagIds([]);
    }
    setConfirmDelete(false);
    setIsCreatingTag(false);
    setNewTagName('');
  }, [personToEdit, isOpen]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;

    if (isEditing && personToEdit) {
      await updatePerson(personToEdit.id, {
        name: cleanName,
        avatarColor,
        tagIds: selectedTagIds,
      });
    } else {
      await addPerson({
        name: cleanName,
        avatarColor,
        tagIds: selectedTagIds,
      });
    }
    onClose();
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleCreateNewTag = async () => {
    const trimmed = newTagName.trim();
    if (!trimmed) return;
    const color = IOS_AVATAR_PALETTE[Math.floor(Math.random() * IOS_AVATAR_PALETTE.length)].hex;
    const created = await addTag({ name: trimmed, color });
    setSelectedTagIds((prev) => [...prev, created.id]);
    setNewTagName('');
    setIsCreatingTag(false);
  };

  const handleDelete = async () => {
    if (!personToEdit) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await deletePerson(personToEdit.id);
    onClose();
  };

  const handleArchiveToggle = async () => {
    if (!personToEdit) return;
    await archivePerson(personToEdit.id, !personToEdit.isArchived);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* iOS Bottom Sheet Card */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 380, mass: 0.8 }}
            className="relative w-full max-w-lg rounded-t-[28px] bg-ios-bg-card shadow-2xl pb-safe flex flex-col max-h-[92vh] overflow-hidden"
          >
            {/* Sheet Grabber */}
            <div className="pt-3 pb-1 flex justify-center shrink-0">
              <div className="w-10 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700" />
            </div>

            {/* Header Navigation */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-ios-separator shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="text-[17px] text-ios-text-secondary hover:text-ios-text-primary active:opacity-60"
              >
                Cancel
              </button>

              <h2 className="text-[17px] font-semibold text-ios-text-primary">
                {isEditing ? 'Edit Person' : 'New Person'}
              </h2>

              <button
                type="button"
                onClick={() => handleSave()}
                disabled={!name.trim()}
                className="text-[17px] font-semibold text-ios-blue disabled:opacity-30 active:opacity-60"
              >
                Done
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
              {/* Preview Avatar Circle */}
              <div className="flex flex-col items-center justify-center space-y-2">
                <Avatar name={name || 'New Person'} avatarColor={avatarColor} size="xl" />
                <span className="text-xs text-ios-text-secondary font-medium">Avatar Preview</span>
              </div>

              {/* Name Input Group */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-ios-text-secondary px-1">
                  Full Name
                </label>
                <div className="rounded-2xl bg-ios-bg-tertiary px-4 py-3 flex items-center shadow-inner">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Jenkins"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus={!isEditing}
                    className="w-full bg-transparent text-base font-medium text-ios-text-primary placeholder:text-ios-text-secondary/50 focus:outline-none"
                  />
                  {name && (
                    <button
                      type="button"
                      onClick={() => setName('')}
                      className="p-1 rounded-full text-ios-text-secondary hover:text-ios-text-primary"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Avatar Color Picker */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-ios-text-secondary px-1">
                  Avatar Color
                </label>
                <div className="grid grid-cols-5 gap-3 p-3 rounded-2xl bg-ios-bg-tertiary">
                  {IOS_AVATAR_PALETTE.map((color) => {
                    const isSelected = avatarColor.toLowerCase() === color.hex.toLowerCase();
                    return (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => setAvatarColor(color.hex)}
                        className="relative flex items-center justify-center w-12 h-12 rounded-full transition-transform active:scale-90"
                        style={{ backgroundColor: color.hex }}
                        aria-label={color.name}
                      >
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-white/90 flex items-center justify-center shadow">
                            <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tags Selector Group */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-ios-text-secondary">
                    Tags
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCreatingTag(!isCreatingTag)}
                    className="text-xs font-medium text-ios-blue flex items-center space-x-1 active:opacity-60"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Tag</span>
                  </button>
                </div>

                {isCreatingTag && (
                  <div className="p-3 rounded-2xl bg-ios-bg-tertiary flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Tag name (e.g. Travel, Dinner)"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateNewTag();
                        }
                      }}
                      className="flex-1 bg-transparent text-base text-ios-text-primary placeholder:text-ios-text-secondary/50 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCreateNewTag}
                      disabled={!newTagName.trim()}
                      className="px-3 py-1 rounded-xl bg-ios-blue text-white text-xs font-semibold disabled:opacity-40"
                    >
                      Add
                    </button>
                  </div>
                )}

                <div className="p-3 rounded-2xl bg-ios-bg-tertiary flex flex-wrap gap-2">
                  {tags.length === 0 ? (
                    <span className="text-xs text-ios-text-secondary">No tags yet. Create one above!</span>
                  ) : (
                    tags.map((tag) => {
                      const isSelected = selectedTagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-ios-blue text-white shadow-sm'
                              : 'bg-ios-bg-card text-ios-text-primary hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: isSelected ? '#FFFFFF' : tag.color }}
                          />
                          <span>{tag.name}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Editing Actions: Archive & Delete */}
              {isEditing && personToEdit && (
                <div className="pt-2 space-y-3">
                  <button
                    type="button"
                    onClick={handleArchiveToggle}
                    className="w-full flex items-center justify-center space-x-2 py-3.5 rounded-2xl bg-ios-bg-tertiary text-ios-text-primary font-semibold text-[15px] active:opacity-70 transition-opacity"
                  >
                    {personToEdit.isArchived ? (
                      <>
                        <ArchiveRestore className="w-5 h-5 text-ios-blue" />
                        <span>Unarchive Person</span>
                      </>
                    ) : (
                      <>
                        <Archive className="w-5 h-5 text-ios-orange" />
                        <span>Archive Person</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDelete}
                    className={`w-full flex items-center justify-center space-x-2 py-3.5 rounded-2xl font-semibold text-[15px] transition-colors ${
                      confirmDelete
                        ? 'bg-ios-red text-white'
                        : 'bg-ios-red/10 text-ios-red active:opacity-70'
                    }`}
                  >
                    <Trash2 className="w-5 h-5" />
                    <span>{confirmDelete ? 'Confirm Delete Person & Debts' : 'Delete Person'}</span>
                  </button>
                </div>
              )}
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
