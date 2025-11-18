import { tags } from "typia";

/**
 * JWT payload for guest users.
 *
 * The `id` corresponds to the primary key of `todo_app_guestusers` and is the
 * top-level identifier for a conceptual guest identity.
 */
export interface GuestuserPayload {
  /** Top-level guest user ID (`todo_app_guestusers.id`). */
  id: string & tags.Format<"uuid">;

  /** Session identifier for the guest user context. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator indicating this payload belongs to a guest user. */
  type: "guestUser";
}
