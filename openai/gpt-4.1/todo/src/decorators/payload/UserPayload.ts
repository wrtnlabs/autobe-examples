import { tags } from "typia";
/** Authenticated payload for Todo List application user. */
export interface UserPayload {
  /** System-wide User ID (todo_list_users.id). */
  id: string & tags.Format<"uuid">;
  /** Session ID (todo_list_user_sessions.id). */
  session_id: string & tags.Format<"uuid">;
  /** Discriminator for user role. */
  type: "user";
}
