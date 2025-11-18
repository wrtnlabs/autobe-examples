import { tags } from "typia";

/** JWT payload for administrative users (adminUser actor). */
export interface AdminuserPayload {
  /** Top-level admin user ID from `todo_app_adminusers.id`. */
  id: string & tags.Format<"uuid">;

  /** Session ID from `todo_app_adminuser_sessions.id`. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for admin user role. */
  type: "adminUser";
}
