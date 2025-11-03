import { tags } from "typia";

/** Authentication payload injected for administrator (admin) actors. */
export interface AdminPayload {
  /** Admin ID (primary key of discussion_board_admins table). */
  id: string & tags.Format<"uuid">;

  /** Admin session ID (primary key of discussion_board_admin_sessions table). */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the admin role. */
  type: "admin";
}
