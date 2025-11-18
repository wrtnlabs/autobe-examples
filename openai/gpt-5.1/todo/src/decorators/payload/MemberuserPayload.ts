import { tags } from "typia";

/** JWT payload for authenticated member users. */
export interface MemberuserPayload {
  /** Top-level member user identifier (todo_app_memberusers.id). */
  id: string & tags.Format<"uuid">;

  /**
   * Session identifier (todo_app_memberuser_sessions.id) associated with this
   * login.
   */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator specifying this payload represents a member user. */
  type: "memberuser";
}
