import { tags } from "typia";

/**
 * JWTPayload for a regular todo user. Provided by UserAuth() decorator after
 * successful authentication.
 */
export interface UserPayload {
  /** Top-level user table ID (todo_users.id). */
  id: string & tags.Format<"uuid">;
  /** Session identifier (todo_user_sessions.id). */
  session_id: string & tags.Format<"uuid">;
  /** The role-type discriminator (always 'user' for todo users) */
  type: "user";
}
