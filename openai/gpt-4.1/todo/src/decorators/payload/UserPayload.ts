import { tags } from "typia";

/** Payload containing authenticated Todo List user identity and session context. */
export interface UserPayload {
  /** Top-level unique user identifier (todo_users.id) */
  id: string & tags.Format<"uuid">;
  /** Session token ID (todo_user_sessions.id) */
  session_id: string & tags.Format<"uuid">;
  /** Discriminator to ensure correct actor injection */
  type: "user";
}
