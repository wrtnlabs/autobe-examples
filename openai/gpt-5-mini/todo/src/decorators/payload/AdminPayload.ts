import { tags } from "typia";

export interface AdminPayload {
  /** Top-level admin ID (uuid) */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the authenticated admin (uuid) */
  session_id: string & tags.Format<"uuid">;

  /** Role discriminator */
  type: "admin";
}
