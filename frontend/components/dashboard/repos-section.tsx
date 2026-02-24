"use client";

import { useState } from "react";
import { AddRepoDialog } from "./add-repo-dialog";
import { ReposTable } from "./repos-table";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Search, ListFilter, ArrowUpDown } from "lucide-react";

export type StatusFilter = "all" | "in_progress" | "done" | "cancelled";
export type SortField = "name" | "status";
export type SortDir = "asc" | "desc";

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export function ReposSection({ currentUser, isAdmin = false }: { currentUser: string; isAdmin?: boolean }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <InputGroup className="max-w-xs">
            <InputGroupInput
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
          </InputGroup>

          {/* Filter by status */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <ListFilter className="h-4 w-4" />
                {statusFilter === "all" ? "Filter" : statusOptions.find((s) => s.value === statusFilter)?.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="font-sans">
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {statusOptions.map((opt) => (
                <DropdownMenuCheckboxItem
                  key={opt.value}
                  checked={statusFilter === opt.value}
                  onCheckedChange={() => setStatusFilter(opt.value)}
                >
                  {opt.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <ArrowUpDown className="h-4 w-4" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="font-sans">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="status">Status</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Direction</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={sortDir} onValueChange={(v) => setSortDir(v as SortDir)}>
                <DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="desc">Descending</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {!isAdmin && <AddRepoDialog onSuccess={() => setRefreshKey((k) => k + 1)} />}
      </div>

      <ReposTable
        currentUser={currentUser}
        refreshKey={refreshKey}
        search={search}
        statusFilter={statusFilter}
        sortField={sortField}
        sortDir={sortDir}
        isAdmin={isAdmin}
      />
    </>
  );
}
