// File path: src/decorators/payload/CommunitymoderatorPayload.ts
import { tags } from "typia";

/**
 * JWT payload for Community Moderator authentication.
 *
 * - `id` is the top-level user table ID (community_platform_users.id)
 * - `type` is the discriminator identifying the role within the system
 */
export interface CommunitymoderatorPayload {
  /** Top-level user table ID (community_platform_users.id). */
  id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "communityModerator";
}
