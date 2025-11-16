import { tags } from "typia";

/** JWT payload for an authenticated standard platform user. */
export interface UserPayload {
  /** Platform user ID (community_platform_users.id) */
  id: string & tags.Format<"uuid">;

  /** Session ID (community_platform_user_sessions.id) */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the user actor role. */
  type: "user";
}
