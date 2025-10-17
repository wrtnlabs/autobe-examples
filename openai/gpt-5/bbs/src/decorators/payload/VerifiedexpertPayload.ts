// File path: src/decorators/payload/VerifiedexpertPayload.ts
import { tags } from "typia";

/**
 * Payload for a verified expert authentication context.
 *
 * - Id always references the top-level econ_discuss_users.id
 */
export interface VerifiedexpertPayload {
  /** Top-level user table ID (econ_discuss_users.id). */
  id: string & tags.Format<"uuid">;

  /** Discriminator for the role union. */
  type: "verifiedExpert";
}
