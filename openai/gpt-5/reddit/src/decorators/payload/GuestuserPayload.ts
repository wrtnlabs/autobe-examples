// File path: src/decorators/payload/GuestuserPayload.ts
import { tags } from "typia";

/**
 * Authenticated payload for guestuser role.
 *
 * - `id` is ALWAYS the top-level users table primary key
 *   (community_platform_users.id)
 * - `type` discriminates this role as "guestuser".
 */
export interface GuestuserPayload {
  /** Top-level user table ID (community_platform_users.id). */
  id: string & tags.Format<"uuid">;

  /** Discriminator for the role union. */
  type: "guestuser";
}
