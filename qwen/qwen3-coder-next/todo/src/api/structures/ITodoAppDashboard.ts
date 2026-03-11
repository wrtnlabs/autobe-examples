import { tags } from "typia";

import { ITodoAppEditHistoryEntry } from "./ITodoAppEditHistoryEntry";
import { ITodoAppTodo } from "./ITodoAppTodo";

export namespace ITodoAppDashboard {
  /**
   * Dashboard overview containing paginated todos, completion statistics, and recent edit history for the authenticated user.
   */
  export type IOverview = {
    /**
     * Paginated list of active todos for the authenticated user.
     *
     * @x-autobe-specification Paginated list of active (is_trashed=false) todos belonging to the authenticated user. Apply filtering by is_complete status, sorting by created_at/start_date/due_date, and pagination with offset/limit.
     */
    todos: ITodoAppTodo.ISummary[];

    /**
     * Total number of active todos for the authenticated user.
     *
     * @x-autobe-specification COUNT(*) of active (is_trashed=false) todos belonging to the authenticated user.
     */
    totalTodos: number & tags.Type<"int32">;

    /**
     * Number of completed active todos for the authenticated user.
     *
     * @x-autobe-specification COUNT(*) of active (is_trashed=false) and is_complete=true todos belonging to the authenticated user.
     */
    completedTodos: number & tags.Type<"int32">;

    /**
     * Array of recent edit history entries for the authenticated user's todos.
     *
     * @x-autobe-specification Retrieve recent edit history entries from todo_app_edit_history_entries for the authenticated user's todos, sorted by created_at DESC, limited to recent entries (e.g., last 10).
     */
    recentEditHistory: ITodoAppEditHistoryEntry[];
  };
}
