import { tags } from "typia";

/**
 * Payload for authenticated Todo List user via JWT. Contains the top-level user
 * account ID and session information.
 */
export interface UserPayload {
  /** Top-level user account UUID (todo_list_users.id). */
  id: string & tags.Format<"uuid">;

  /** The session ID associated with the authenticated session. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for user authentication type. */
  type: "user";
}
