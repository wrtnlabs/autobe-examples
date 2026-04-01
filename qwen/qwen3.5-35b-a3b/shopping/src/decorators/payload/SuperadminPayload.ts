import { tags } from "typia";

export interface SuperAdminPayload {
  id: string & tags.Format<"uuid">;
  session_id: string & tags.Format<"uuid">;
  type: "super_admin";
}
