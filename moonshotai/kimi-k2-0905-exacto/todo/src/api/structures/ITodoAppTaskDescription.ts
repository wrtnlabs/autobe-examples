export namespace ITodoAppTaskDescription {
  /**
   * Complete description type providing full task details for the
   * todo_app_tasks.description field.
   *
   * This structured description format enables rich text content while
   * maintaining consistent formatting across the application. The content
   * field represents the detailed task information from the Prisma database
   * schema, supporting up to 1000 characters of comprehensive task context,
   * instructions, and additional notes.
   *
   * The type discriminator ensures consistent content handling across
   * different task description formats while providing future extensibility
   * for additional description types within the todo application's task
   * management system.
   */
  export type IFull = {
    /**
     * Content type discriminator identifying this as a full task
     * description format. Used for structured content handling and API
     * response consistency.
     */
    type: "full";

    /**
     * Complete detailed task description text providing comprehensive
     * context, instructions, and additional notes. Maps directly to the
     * description column in todo_app_tasks table, supporting extended
     * content up to 1000 characters for thorough task documentation.
     */
    content: string;
  };
}
