import { tags } from "typia";

/** Authenticated payload for a registered Todo List user. */
export interface UserPayload {
  /** Globally unique top-level user ID from todo_list_users.id */
  id: string & tags.Format<"uuid">;

  /** User session ID from todo_list_user_sessions.id */
  session_id: string & tags.Format<"uuid">;

  /** Role discriminator. */
  type: "user";
}
