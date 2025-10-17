import { tags } from "typia";

/**
 * JWT payload interface for a regular user account.
 *
 * - Id: Always the top-level user id (todo_list_users.id; UUID)
 * - Type: "user" discriminator
 */
export interface UserPayload {
  /** Top-level user table ID (the fundamental user identifier in the system). */
  id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "user";
}
