import { tags } from "typia";

export interface AdminPayload {
  /** Administrator's user ID. */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the admin user. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "admin";
}
