import { tags } from "typia";

export interface SuperadministratorPayload {
  id: string & tags.Format<"uuid">;
  session_id: string & tags.Format<"uuid">;
  type: "superadministrator";
}
