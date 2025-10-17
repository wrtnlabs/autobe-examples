import { tags } from "typia";

export namespace ITodoListTodoMemberRestore {
  /**
   * Account restoration request for Todo Member.
   *
   * This payload is optional and does not map directly to a Prisma model.
   */
  export type ICreate = {
    /**
     * Optional human-readable reason for restoration.
     *
     * Used for audit or policy workflows; not persisted in the Prisma model
     * unless implemented separately.
     */
    reason?: (string & tags.MaxLength<500>) | undefined;
  };
}
