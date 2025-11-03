import { tags } from "typia";

/**
 * UserPayload represents the information injected when a user authenticates.
 *
 * - Id: top-level user id
 * - Session_id: session UUID
 * - Type: must be 'user'
 */
export interface UserPayload {
  /** Top-level user id (community_platform_users.id). */
  id: string & tags.Format<"uuid">;

  /** Session id (community_platform_user_sessions.id). */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the user role. */
  type: "user";
}
