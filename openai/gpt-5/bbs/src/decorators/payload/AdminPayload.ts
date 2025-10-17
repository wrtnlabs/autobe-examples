// File path: src/decorators/payload/AdminPayload.ts
import { tags } from "typia";

/**
 * JWT payload for Admin role.
 *
 * - Id is ALWAYS the top-level user table ID (econ_discuss_users.id)
 */
export interface AdminPayload {
  /** Top-level user table ID (econ_discuss_users.id). */
  id: string & tags.Format<"uuid">;
  /** Role discriminator. */
  type: "admin";
}
