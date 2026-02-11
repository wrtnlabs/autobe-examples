import { tags } from "typia";

export interface CommunitymoderatorPayload {
  id: string & tags.Format<"uuid">;
  session_id: string & tags.Format<"uuid">;
  type: "communityModerator";
}
