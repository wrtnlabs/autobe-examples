import { tags } from "typia";

/**
 * Payload for authenticated administrator user. Contains root admin account ID,
 * session info, and discriminator type.
 */
export interface AdminPayload {
  /** Top-level admin table ID (discussion_board_admins.id) */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with this admin session */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for admin role */
  type: "admin";
}
