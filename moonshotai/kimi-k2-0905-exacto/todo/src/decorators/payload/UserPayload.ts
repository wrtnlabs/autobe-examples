import { tags } from "typia";

export interface UserPayload {
  /** Top-level user table ID (todo_app_users.id). */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the user session. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the user role. */
  type: "user";
}
