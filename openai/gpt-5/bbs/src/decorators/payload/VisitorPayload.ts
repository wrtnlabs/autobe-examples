// File path: src/decorators/payload/VisitorPayload.ts
import { tags } from "typia";

/**
 * JWT payload for a Visitor role.
 *
 * Note: `id` is the top-level user table ID (econ_discuss_users.id), not a
 * role-assignment table ID.
 */
export interface VisitorPayload {
  /** Top-level user table ID (the fundamental user identifier). */
  id: string & tags.Format<"uuid">;
  /** Discriminator for union narrowing. */
  type: "visitor";
}
