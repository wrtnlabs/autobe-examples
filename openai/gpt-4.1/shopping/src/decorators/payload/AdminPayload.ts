import { tags } from "typia";

/** Authenticated payload for Admin actor */
export interface AdminPayload {
  /** Top-level admin ID (UUID of shopping_admins row) */
  id: string & tags.Format<"uuid">;
  /** Session ID associated with the admin session (UUID) */
  session_id: string & tags.Format<"uuid">;
  /** Discriminator for admin role */
  type: "admin";
}
