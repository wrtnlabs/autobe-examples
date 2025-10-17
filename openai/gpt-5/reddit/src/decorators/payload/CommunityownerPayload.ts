import { tags } from "typia";

/** JWT payload for Community Owner role. */
export interface CommunityownerPayload {
  /** Top-level user table ID (community_platform_users.id). */
  id: string & tags.Format<"uuid">;
  /** Discriminator for the role. */
  type: "communityowner";
}
