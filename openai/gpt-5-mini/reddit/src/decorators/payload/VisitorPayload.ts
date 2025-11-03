import { tags } from "typia";

export interface VisitorPayload {
  /** Top-level visitor ID (community_bbs_visitor.id) */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with this visitor (community_bbs_visitor_sessions.id) */
  session_id: string & tags.Format<"uuid">;

  /** Role discriminator */
  type: "visitor";
}
