import { tags } from "typia";

/** AdminPayload: JWT-authenticated admin actor type for the Todo List system */
export interface AdminPayload {
  /** Top-level admin user ID (UUID) */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the authenticated admin (UUID) */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for admin role */
  type: "admin";
}
