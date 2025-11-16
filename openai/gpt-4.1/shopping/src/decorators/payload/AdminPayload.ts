import { tags } from "typia";

/** JWT payload for Shopping Mall Admin authentication. */
export interface AdminPayload {
  /** Top-level admin account ID (shopping_mall_admins PK). */
  id: string & tags.Format<"uuid">;

  /** Admin session ID for the current login session. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the admin payload type. */
  type: "admin";
}
