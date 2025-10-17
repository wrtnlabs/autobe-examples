// File path: src/decorators/payload/MemberuserPayload.ts
import { tags } from "typia";

/**
 * JWT payload for authenticated Member User.
 *
 * - Id MUST be the top-level user table ID (community_platform_users.id)
 * - Type discriminates the role
 */
export interface MemberuserPayload {
  /** Top-level user table ID (fundamental user identifier). */
  id: string & tags.Format<"uuid">;
  /** Discriminator for the role. */
  type: "memberuser";
}
