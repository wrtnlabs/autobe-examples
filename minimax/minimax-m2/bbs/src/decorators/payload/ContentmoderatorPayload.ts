import { tags } from "typia";

export interface ContentmoderatorPayload {
  /**
   * Top-level user table ID (the fundamental user identifier in the system).
   * Links to econ_political_discussion_users.id
   */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the content moderator user. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "content_moderator";
}
