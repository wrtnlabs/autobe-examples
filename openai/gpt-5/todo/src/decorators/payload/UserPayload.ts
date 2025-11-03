import { tags } from "typia";

/** JWT payload for authenticated end user. */
export interface UserPayload {
  /** Top-level user table ID (todo_users.id). */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the user (todo_user_sessions.id). */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the authenticated actor. */
  type: "user";
}
