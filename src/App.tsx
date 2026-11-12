import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { DebtyProvider, useDebty } from './context/DebtyContext';
import { Dashboard } from './components/Dashboard';
import { PersonDetail } from './components/PersonDetail';
import { PersonModal } from './components/PersonModal';
import { SettingsModal } from './components/SettingsModal';
import { StatementModal } from './components/StatementModal';
import { Person } from './types/debty';

const AppContent: React.FC = () => {
  const { isLoading, people } = useDebty();

  const [isPersonModalOpen, setIsPersonModalOpen] = useState<boolean>(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [statementPerson, setStatementPerson] = useState<Person | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--bg-grouped)]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-[3px] border-[var(--ios-blue)] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-[var(--label-secondary)] tracking-wider uppercase">
            Loading Debty...
          </span>
        </div>
      </div>
    );
  }

  const selectedPerson = selectedPersonId ? people.find((p) => p.id === selectedPersonId) : null;

  return (
    <div id="app-shell" className="relative h-full w-full overflow-hidden bg-[var(--bg-grouped)]">
      {/* Main Dashboard Screen */}
      <Dashboard
        onOpenAddPerson={() => {
          setEditingPerson(null);
          setIsPersonModalOpen(true);
        }}
        onOpenSettings={() => {
          setIsSettingsOpen(true);
        }}
        onSelectPerson={(personId: string) => {
          setSelectedPersonId(personId);
        }}
      />

      {/* Slide-over Person Detail Screen */}
      <AnimatePresence>
        {selectedPerson && (
          <PersonDetail
            key={selectedPerson.id}
            person={selectedPerson}
            onBack={() => setSelectedPersonId(null)}
            onEditPerson={(p) => {
              setEditingPerson(p);
              setIsPersonModalOpen(true);
            }}
            onOpenStatement={(p) => {
              setStatementPerson(p);
            }}
          />
        )}
      </AnimatePresence>

      {/* Person Create/Edit Modal */}
      <PersonModal
        isOpen={isPersonModalOpen}
        onClose={() => {
          setIsPersonModalOpen(false);
          setEditingPerson(null);
        }}
        personToEdit={editingPerson}
      />

      {/* Settings & Data Manager Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Shareable / Printable Statement Modal */}
      {statementPerson && (
        <StatementModal
          isOpen={Boolean(statementPerson)}
          onClose={() => setStatementPerson(null)}
          person={statementPerson}
        />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <DebtyProvider>
      <AppContent />
    </DebtyProvider>
  );
};

export default App;
