import { tags } from "typia";

export namespace ITodoListTodoMemberPassword {
  /**
   * Password rotation request for a todoMember account.
   *
   * This DTO drives a security operation against the Prisma model
   * `todo_list_todo_members` which defines `password_hash` and lifecycle
   * timestamps. The operation verifies `current_password`, computes a new
   * strong hash from `new_password`, updates `password_hash`, and updates
   * `updated_at`. It must only be available to active accounts where
   * `deleted_at` is null.
   *
   * Note: This request schema does not directly correspond to database
   * columns; it intentionally excludes fields like `password_hash`, `email`,
   * and timestamps. It accepts only the minimal values necessary to perform
   * secure password rotation.
   */
  export type IUpdate = {
    /**
     * The member's current plaintext password for verification.
     *
     * Provided by the authenticated user to prove possession of existing
     * credentials. The backend MUST verify this value against the stored
     * `password_hash` in `todo_list_todo_members` using a constant-time
     * comparison. This value is never persisted in plaintext.
     */
    current_password?:
      | (string & tags.MinLength<8> & tags.Format<"password">)
      | undefined;

    /**
     * The desired new plaintext password to replace the existing secret.
     *
     * On success, the backend MUST hash this value (e.g., Argon2id/Bcrypt)
     * and store the resulting hash in
     * `todo_list_todo_members.password_hash`. The plaintext value is never
     * stored. Enforce policy such as minimum length and strength according
     * to business requirements.
     */
    new_password?:
      | (string & tags.MinLength<8> & tags.Format<"password">)
      | undefined;
  };
}
