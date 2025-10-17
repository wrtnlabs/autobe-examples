// File path: src/decorators/payload/AdminuserPayload.ts
import { tags } from "typia";

/**
 * JWT payload for Adminuser authentication. id always represents the top-level
 * user table primary key (community_platform_users.id).
 */
export interface AdminuserPayload {
  /** Top-level user ID (UUID). */
  id: string & tags.Format<"uuid">;
  /** Discriminator for role identification. */
  type: "adminuser";
}
