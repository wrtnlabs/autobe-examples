import { tags  from "typia";

export interface SellerPayload {
  id: string & tags.Format<"uuid">;
  session_id: string & tags.Format<"uuid">;
  type: "seller";
}
