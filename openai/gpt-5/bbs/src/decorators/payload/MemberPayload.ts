// File path: src/decorators/payload/MemberPayload.ts
import { tags } from "typia";

/**
 * JWT payload for authenticated Member users.
 *
 * Note:
 *
 * - `id` is ALWAYS the top-level user table identifier (econ_discuss_users.id)
 * - `type` is the discriminator for union typing across roles
 */
export interface MemberPayload {
  /** Top-level user table ID (econ_discuss_users.id). */
  id: string & tags.Format<"uuid">;
  /** Discriminator for role identification. */
  type: "member";
}
