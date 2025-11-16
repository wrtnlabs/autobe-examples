import { tags } from "typia";

/** JWT payload for authenticated todouser actors. */
export interface TodouserPayload {
  /**
   * Top-level todo user ID.
   *
   * Corresponds to `todo_app_todousers.id` in the database.
   */
  id: string & tags.Format<"uuid">;

  /**
   * Session identifier for the authenticated todouser.
   *
   * Corresponds to `todo_app_todouser_sessions.id`.
   */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator indicating this payload belongs to a todouser actor. */
  type: "todouser";
}
