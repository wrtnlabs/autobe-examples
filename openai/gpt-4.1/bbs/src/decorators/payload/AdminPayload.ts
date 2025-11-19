import { tags } from "typia";

/**
 * Payload injected for authenticated admin users.
 *
 * - Id: UUID of admin (primary key for discussion_board_admins)
 * - Session_id: UUID of related session (discussion_board_admin_sessions.id)
 * - Type: Discriminator identifying administrator payload
 */
export interface AdminPayload {
  /** Admin account ID (primary key of discussion_board_admins) */
  id: string & tags.Format<"uuid">;
  /** Session ID (primary key of discussion_board_admin_sessions) */
  session_id: string & tags.Format<"uuid">;
  /** Discriminator for admin role. */
  type: "admin";
}
