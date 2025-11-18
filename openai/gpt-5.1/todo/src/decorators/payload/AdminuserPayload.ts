import { tags } from "typia";

/** JWT payload for administrative users of the todoApp. */
export interface AdminuserPayload {
  /** Top-level admin user identifier (todo_app_adminusers.id). */
  id: string & tags.Format<"uuid">;

  /** Session identifier (todo_app_adminuser_sessions.id). */
  session_id: string & tags.Format<"uuid">;

  /** Role discriminator for administrative users. */
  type: "admin";
}
