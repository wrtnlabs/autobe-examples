import { tags } from "typia";

/** JWT payload for System Admin authentication context. */
export interface SystemadminPayload {
  /** Top-level user table ID (equals todo_list_system_admins.id). */
  id: string & tags.Format<"uuid">;
  /** Discriminator for the role. */
  type: "systemadmin";
}
