import { tags } from "typia";

/**
 * JWT payload type for authenticated users.
 *
 * - Id: top-level user id (todo_user.id)
 * - Session_id: jwt session identifier (todo_user_sessions.id)
 * - Type: role discriminator ('user')
 */
export interface UserPayload {
  /** Top-level user id (todo_user.id) */
  id: string & tags.Format<"uuid">;
  /** Session assigned to this authentication (todo_user_sessions.id) */
  session_id: string & tags.Format<"uuid">;
  /** Role discriminator */
  type: "user";
}
