import { tags } from "typia";

export interface PlatformadminPayload {
  id: string & tags.Format<"uuid">;
  session_id: string & tags.Format<"uuid">;
  type: "platformadmin";
}
