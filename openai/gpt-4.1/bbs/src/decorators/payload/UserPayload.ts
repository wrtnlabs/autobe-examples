import { tags } from "typia";

/** Authenticated payload for discussion board end user (member). */
export interface UserPayload {
  /** Top-level user ID (discussion_board_users primary key). */
  id: string & tags.Format<"uuid">;
  /**
   * Session ID for this login session (corresponds to
   * discussion_board_user_sessions.id).
   */
  session_id: string & tags.Format<"uuid">;
  /** Discriminator for role-typed JWT payload. */
  type: "user";
}
