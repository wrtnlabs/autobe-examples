import { tags } from "typia";

export interface GuestPayload {
  id: string & tags.Format<"uuid">;
  ip: string;
  type: "guest";
}
