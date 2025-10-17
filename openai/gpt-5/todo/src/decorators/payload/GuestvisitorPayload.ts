// File path: src/decorators/payload/GuestvisitorPayload.ts
import { tags } from "typia";

/**
 * JWT payload for Guestvisitor role.
 *
 * Note: `id` is the top-level user identifier for this role, corresponding to
 * the primary key of `todo_list_guest_visitors`.
 */
export interface GuestvisitorPayload {
  /** Top-level user table ID (UUID). */
  id: string & tags.Format<"uuid">;

  /** Discriminator for Guestvisitor role. */
  type: "guestvisitor";
}
