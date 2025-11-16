import { tags } from "typia";

/**
 * JWT payload for guest users.
 *
 * For guests, `id` represents the primary key of the
 * `discussion_board_guestusers` table, which is the top-level identifier for a
 * persisted guest identity. Guests are limited to read-only access in the
 * discussion board.
 */
export interface GuestuserPayload {
  /** Top-level guest user identifier (discussion_board_guestusers.id). */
  id: string & tags.Format<"uuid">;

  /** Session identifier associated with this guest visit. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for role identification. */
  type: "guestUser";
}
