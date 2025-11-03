import { tags } from "typia";

/** Payload for authenticated todoUser. Injected by TodouserAuth decorator. */
export interface TodouserPayload {
  /**
   * Top-level user table ID (the fundamental user identifier in the system).
   * {@link todo_list_todousers.id}
   */
  id: string & tags.Format<"uuid">;

  /**
   * Session ID associated with the todo user.
   * {@link todo_list_todouser_sessions.id}
   */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the authenticated actor type. */
  type: "todoUser";
}
