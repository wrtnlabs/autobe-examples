import { tags } from "typia";

/** JWT-authenticated admin payload structure. */
export interface AdminPayload {
  /** Admin account unique identifier (UUID from todo_list_admins.id). */
  id: string & tags.Format<"uuid">;

  /** Current session UUID for the admin. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator: must be "admin" for admin tokens. */
  type: "admin";
}
