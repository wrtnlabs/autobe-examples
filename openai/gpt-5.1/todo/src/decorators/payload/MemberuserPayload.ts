import { tags } from "typia";

/**
 * JWT payload for authenticated member users.
 *
 * Represents the fundamental member user identity and the bound session.
 */
export interface MemberuserPayload {
  /** Top-level member user identifier (todo_app_memberusers.id). */
  id: string & tags.Format<"uuid">;

  /**
   * Session identifier (todo_app_memberuser_sessions.id) associated with the
   * authenticated member user.
   */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator indicating this payload belongs to a member user. */
  type: "memberuser";
}
