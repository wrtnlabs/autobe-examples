import { tags } from "typia";

/**
 * JWT payload for authenticated discussion board member users.
 *
 * This represents the top-level member user identifier and the concrete session
 * from which the request originates.
 */
export interface MemberuserPayload {
  /**
   * Top-level member user ID.
   *
   * References {@link discussion_board_memberusers.id}.
   */
  id: string & tags.Format<"uuid">;

  /**
   * Session ID associated with this authentication.
   *
   * References {@link discussion_board_memberuser_sessions.id}.
   */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for member user role. */
  type: "memberuser";
}
