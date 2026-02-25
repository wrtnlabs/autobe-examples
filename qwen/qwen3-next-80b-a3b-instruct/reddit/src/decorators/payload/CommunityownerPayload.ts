import { tags } from "typia";

export interface CommunityownerPayload {
  id: string & tags.Format<"uuid">;
  session_id: string & tags.Format<"uuid">;
  type: "communityOwner";
}
