// File: src/decorators/payload/SuperadminPayload.ts
import { tags } from "typia";

export interface SuperadminPayload {
  id: string & tags.Format<"uuid">;
  session_id: string & tags.Format<"uuid">;
  type: "super_admin";
}
