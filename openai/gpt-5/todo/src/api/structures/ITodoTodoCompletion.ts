export namespace ITodoTodoCompletion {
  /**
   * Request DTO to toggle the completion status of a personal todo. Ownership
   * is enforced by authentication context and the `todoId` path parameter;
   * request bodies MUST NOT contain `id`, `todo_user_id`, or timestamps.
   * Based on Prisma model `todo_todos` (columns include: id, todo_user_id,
   * title, description, due_date, completed, created_at, updated_at).
   */
  export type IUpdate = {
    /**
     * Target completion state for the todo item. Maps to the boolean column
     * `todo_todos.completed` in Prisma. Idempotent semantics: setting to
     * the existing state is treated as success without additional side
     * effects. Other fields are not changed by this specialized endpoint.
     */
    completed: boolean;
  };
}
