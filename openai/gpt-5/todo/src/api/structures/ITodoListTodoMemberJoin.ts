import { tags } from "typia";

export namespace ITodoListTodoMemberJoin {
  /**
   * Registration (join) payload for creating a new todoMember account.
   *
   * Directly associated with the Prisma model Actors.todo_list_todo_members,
   * which defines id (UUID PK), email (unique), password_hash (stored hash
   * only), created_at, updated_at, and deleted_at (nullable soft-deactivation
   * marker). This DTO intentionally excludes system-managed fields (id,
   * created_at, updated_at, deleted_at) and excludes password_hash, accepting
   * only the plain password for server-side hashing.
   */
  export type ICreate = {
    /**
     * Member’s login identifier (email) to persist in the
     * todo_list_todo_members.email column.
     *
     * Per Prisma schema comments, this value should be normalized to
     * lowercase at the application layer. A unique constraint exists
     * (@@unique([email])).
     */
    email: string & tags.Format<"email">;

    /**
     * Plaintext password submitted by the client for credential creation.
     *
     * Back-end MUST hash this value (e.g., Argon2id/Bcrypt) before storage
     * into the password_hash column of the todo_list_todo_members table.
     * Plaintext MUST NEVER be persisted.
     */
    password: string;
  };
}
