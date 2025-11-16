import { tags } from "typia";

/**
 * JWT payload for authenticated todo admin actors.
 *
 * Note: `id` references {@link todo_app_todoadmins.id} (top-level admin
 * account), while `session_id` references
 * {@link todo_app_todoadmin_sessions.id}.
 */
export interface TodoadminPayload {
  /** Top-level admin table ID (todo_app_todoadmins.id). */
  id: string & tags.Format<"uuid">;

  /**
   * Session ID associated with this admin login
   * (todo_app_todoadmin_sessions.id).
   */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator indicating this payload belongs to a todoAdmin actor. */
  type: "todoAdmin";
}
