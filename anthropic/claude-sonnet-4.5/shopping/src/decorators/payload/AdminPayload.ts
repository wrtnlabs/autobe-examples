import { tags } from "typia";

export interface AdminPayload {
  /** Top-level admin user ID (primary identifier for the admin account). */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the admin user. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "admin";
}
