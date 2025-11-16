import { tags } from "typia";

/**
 * JWT payload for guestUser actors.
 *
 * Represents an unauthenticated visitor tracked by a guest identity and
 * session.
 */
export interface GuestuserPayload {
  /**
   * Top-level guest user identity ID.
   *
   * Maps to `todo_app_guestusers.id`.
   */
  id: string & tags.Format<"uuid">;

  /**
   * Session identifier for this guest user.
   *
   * Maps to `todo_app_guestuser_sessions.id`.
   */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator identifying this payload as a guestUser actor. */
  type: "guestUser";
}
