import { tags } from "typia";

export interface CommunitymemberPayload {
  /** Top-level community member ID (the fundamental user identifier). */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with this authentication session. */
  session_id: string & tags.Format<"uuid">;

  /** Role discriminator for the authenticated actor. */
  type: "communitymember";
}
