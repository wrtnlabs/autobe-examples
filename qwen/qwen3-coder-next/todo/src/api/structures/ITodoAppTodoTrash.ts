export namespace ITodoAppTodoTrash {
  /**
   * Lightweight representation of a trashed todo item showing essential trash information including the original todo title and deletion timestamp. This DTO provides a snapshot of the todo item's state at the time it was soft-deleted to trash, enabling users to identify and manage their deleted items.
   */
  export type ISummary = {};

  /**
   * Request parameters for filtering and paginating trashed todo items list. Supports date range filtering for deletion dates, due dates, and start dates, plus configurable sorting and pagination options.
   */
  export type IRequest = {};
}
