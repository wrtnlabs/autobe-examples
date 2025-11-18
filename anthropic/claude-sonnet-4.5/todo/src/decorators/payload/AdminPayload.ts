import { tags } from "typia";

/** JWT payload structure for admin authentication context. */
export interface AdminPayload {
  /** Admin account's primary UUID (todo_list_admins.id). */
  id: string & tags.Format<"uuid">;
  /** Session UUID for the current admin authentication session. */
  session_id: string & tags.Format<"uuid">;
  /** Discriminator for admin role authentication. */
  type: "admin";
}
