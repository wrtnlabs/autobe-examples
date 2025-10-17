import { tags } from "typia";

export interface AdminPayload {
  /** Top-level user table ID (community_portal_users.id). */
  id: string & tags.Format<"uuid">;

  /** Discriminator for the role type. */
  type: "admin";
}
