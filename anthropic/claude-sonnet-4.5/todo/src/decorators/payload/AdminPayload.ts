import { tags } from "typia";

export interface AdminPayload {
  /** Administrator account ID (top-level user identifier). */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the admin authentication. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the authentication role type. */
  type: "admin";
}
