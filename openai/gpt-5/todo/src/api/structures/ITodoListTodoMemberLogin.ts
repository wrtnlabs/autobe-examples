import { tags } from "typia";

export namespace ITodoListTodoMemberLogin {
  /**
   * Login request payload for existing Todo members.
   *
   * This DTO carries credentials for authentication against the Actors table
   * `todo_list_todo_members`. The service normalizes `email`, verifies
   * `password` against `password_hash`, ensures the account is active
   * (`deleted_at` is null), and issues an `ITodoListTodoMember.IAuthorized`
   * response on success.
   */
  export type ICreate = {
    /**
     * Member’s login identifier.
     *
     * Corresponds to `todo_list_todo_members.email` (unique) as described
     * in the Prisma schema comments. The application normalizes emails to
     * lowercase before lookup to honor case-insensitive policies.
     */
    email: string & tags.Format<"email">;

    /**
     * Plaintext password submitted for verification during login.
     *
     * Back-end validates this against
     * `todo_list_todo_members.password_hash` using a strong algorithm
     * (e.g., Argon2id/Bcrypt). The plaintext password is never stored.
     */
    password: string & tags.MinLength<8>;
  };
}
