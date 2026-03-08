import { tags } from "typia";

export interface AdministratorPayload {
  id: string & tags.Format<"uuid">;
  session_id: string & tags.Format<"uuid">;
  type: "administrator";
}
