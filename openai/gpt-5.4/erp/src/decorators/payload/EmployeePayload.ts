import { tags } from "typia";

export interface EmployeePayload {
  id: string & tags.Format<"uuid">;
  session_id: string & tags.Format<"uuid">;
  type: "employee";
}
