import { tags } from "typia";

/**
 * Payload injected for authenticated discussion board users.
 *
 * - Id: Top-level user unique identifier (discussion_board_users.id)
 * - Session_id: Session unique identifier (discussion_board_user_sessions.id)
 * - Type: Always "user" for user actors
 */
export interface UserPayload {
  /** Top-level user table ID (discussion_board_users.id) */
  id: string & tags.Format<"uuid">;

  /** Session ID (discussion_board_user_sessions.id) */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the authenticated user role. */
  type: "user";
}
