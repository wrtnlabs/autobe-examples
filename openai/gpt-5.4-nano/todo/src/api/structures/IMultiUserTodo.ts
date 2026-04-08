import { tags } from "typia";

export namespace IMultiUserTodo {
  /**
   * Request payload for permanently deleting multiple member-owned todos.
   *
   * The request contains todoIds, a non-empty array of UUIDs. The server will permanently remove those todos only when they belong to the authenticated member, and it will not perform partial deletion if any provided ID fails validation or ownership checks.
   */
  export type IBulkPermanentDeleteRequest = {
    /**
     * List of todo UUIDs to permanently delete.
     *
     * Provide a non-empty array of UUID strings. The server will permanently delete only todos owned by the authenticated member, and will not perform partial deletion if any provided ID is missing or not owned by that member.
     *
     * @x-autobe-specification Interpret todoIds[] as the candidate set of multi_user_todos primary keys to permanently delete.
     *
     * The service must:
     * - Require a non-empty list (validated by the DTO).
     * - De-duplicate the array values.
     * - Use the unique set as the IN filter when selecting owned todos for the authenticated member.
     * - Apply anti-partial behavior: only proceed with permanent deletion if every unique requested ID is found and owned by the authenticated member; otherwise abort without deleting anything.
     */
    todoIds: (string & tags.Format<"uuid">)[] & tags.MinItems<1>;
  };

  /**
   * Summarizes the outcome of permanently deleting multiple of the authenticated member’s todos.
   *
   * The response includes the exact set of todo IDs that the server verified for the requesting member and permanently removed. Because the endpoint is anti-partial, this success response is returned only when all requested IDs pass ownership/consistency checks and the deletion completes without partial outcomes.
   */
  export type IBulkPermanentDeleteResult = {
    /**
     * List of todo IDs that were permanently deleted for the authenticated member.
     *
     * This list contains the exact UUIDs that passed the endpoint’s ownership/consistency checks and were then permanently removed. Due to anti-partial behavior, the server only returns this DTO when all requested IDs are eligible for deletion and no partial success is produced.
     *
     * @x-autobe-specification Return the array of UUIDs for todos that were permanently deleted for the authenticated member.
     *
     * The array must contain exactly those todo IDs that:
     * - were successfully matched in the ownership/consistency check against the authenticated member, and
     * - were then permanently deleted by the server as part of this request.
     *
     * Anti-partial guarantee: if ownership/consistency validation fails for any requested todoId, the operation aborts and this result DTO is not returned, so deletedTodoIds is never partially populated for an invalid request.
     */
    deletedTodoIds: (string & tags.Format<"uuid">)[];

    /**
     * Number of todos that were permanently deleted.
     *
     * This is an aggregate derived from deletedTodoIds and must always match the length of the returned deletedTodoIds array in successful responses.
     *
     * @x-autobe-specification Return the number of permanently deleted todos for this request.
     *
     * deletedCount must always equal deletedTodoIds.length in successful responses returned by the endpoint.
     */
    deletedCount: number & tags.Type<"int32"> & tags.Minimum<0>;
  };

  /**
   * Search criteria for an authenticated member’s todo list.
   *
   * Use this request to filter and browse the member’s own todos with optional completion filtering, normal-vs-trash visibility selection, free-text search on title/description, configurable sorting, and pagination.
   */
  export type IRequest = {
    /**
     * Filter completion status for the normal todo list.
     *
     * - all: include both complete and incomplete todos
     * - complete: include only completed todos
     * - incomplete: include only incomplete todos
     *
     * This filter is applied to the normal (non-trash) browsing set.
     *
     * @x-autobe-specification Interpret completionFilter as follows when browsing the normal (non-trash) visibility set:
     * - all: omit any multi_user_todo_todos.is_complete predicate
     * - complete: apply multi_user_todo_todos.is_complete = true
     * - incomplete: apply multi_user_todo_todos.is_complete = false
     * If completionFilter is omitted, treat it as all (no is_complete restriction).
     */
    completionFilter?: "all" | "complete" | "incomplete" | undefined;

    /**
     * Select which visibility set to browse.
     *
     * - normal: todos that are not deleted (active)
     * - trash: todos that are deleted but not permanently deleted
     *
     * Permanently deleted todos are never returned.
     *
     * @x-autobe-specification Interpret trashState to select which todo visibility set to browse:
     * - normal: return active todos (not deleted per service semantics)
     * - trash: return trashed todos (soft-deleted) but do not include permanently deleted records
     * If trashState is omitted, default to normal (active) browsing.
     */
    trashState?: "normal" | "trash" | undefined;

    /**
     * Optional text to match against todo fields.
     *
     * When provided, the backend uses the text to filter todos by matching against the todo’s title and description using the system’s configured text/trigram search strategy.
     *
     * When omitted, no title/description search restriction is applied.
     *
     * @x-autobe-specification If searchText is provided and is a non-empty string:
     * - apply a text/trigram search predicate on multi_user_todo_todos.title
     * - apply a text/trigram search predicate on multi_user_todo_todos.description
     * - return todos that match either field (OR semantics), while still applying ownership scope and trashState visibility constraints.
     * If omitted or empty, do not add any title/description search predicate.
     */
    searchText?: string | undefined;

    /**
     * Sort criterion.
     *
     * Select the primary field used to order the result set.
     *
     * Options:
     * - createdAt: sort by the todo’s creation time
     * - startDate: sort by the todo’s start date (NULLs last)
     * - dueDate: sort by the todo’s due date (NULLs last)
     *
     * @x-autobe-specification Use sortBy to select the primary ordering field:
     * - createdAt => multi_user_todo_todos.created_at
     * - startDate => multi_user_todo_todos.start_date (NULLs last)
     * - dueDate => multi_user_todo_todos.due_date (NULLs last)
     * If sortBy is omitted, default to createdAt ordering.
     */
    sortBy?: "createdAt" | "startDate" | "dueDate" | undefined;

    /**
     * Direction for the chosen sort criterion.
     *
     * - For createdAt: newestFirst or oldestFirst
     * - For startDate/dueDate: earliestFirst or latestFirst
     *
     * For start_date/due_date, NULL values are placed after non-NULL values (NULLs last).
     *
     * @x-autobe-specification Interpret sortDirection relative to sortBy:
     * - If sortBy = createdAt:
     *   - newestFirst => multi_user_todo_todos.created_at DESC
     *   - oldestFirst => multi_user_todo_todos.created_at ASC
     * - If sortBy = startDate:
     *   - earliestFirst => multi_user_todo_todos.start_date ASC (NULLs last)
     *   - latestFirst => multi_user_todo_todos.start_date DESC (NULLs last)
     * - If sortBy = dueDate:
     *   - earliestFirst => multi_user_todo_todos.due_date ASC (NULLs last)
     *   - latestFirst => multi_user_todo_todos.due_date DESC (NULLs last)
     * If sortDirection is omitted, default to newestFirst (for createdAt) or latestFirst (for startDate/dueDate) per implementation-default UI expectation.
     */
    sortDirection?:
      | "newestFirst"
      | "oldestFirst"
      | "earliestFirst"
      | "latestFirst"
      | undefined;

    /**
     * Page number for pagination (1-based).
     *
     * Indicates which page of results the client requests. The first page is page 1.
     *
     * @x-autobe-specification Treat page as a 1-based page number.
     * Compute offset as:
     * - offset = (page - 1) * limit
     * Apply offset and limit after filtering and sorting.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of items per page.
     *
     * Controls how many todo items are returned in a single response page. The last page may contain fewer items if there are not enough matches.
     *
     * @x-autobe-specification Treat limit as the maximum number of items to return for a single page.
     * Apply limit after filtering and sorting, using the offset derived from page.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };
}
