import { tags } from "typia";

import { IRedditCommunity } from "./IRedditCommunity";
import { IRedditMember } from "./IRedditMember";

export namespace IRedditCommunitySubscription {
  /**
   * Summary representation of user community subscriptions with essential information for display and navigation including community, member, timestamps, and soft deletion status.
   */
  export type ISummary = {
    /**
     * Unique subscription identifier.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_community_subscriptions.id
     */
    id: string & tags.Format<"uuid">;

    /**
     * The community this user is subscribed to.
     *
     * @x-autobe-database-schema-property community
     * @x-autobe-specification Join from reddit_community_subscriptions.community_id to reddit_communities.id, returns IRedditCommunity.ISummary
     */
    community: IRedditCommunity.ISummary;

    /**
     * The user who is subscribed to the community.
     *
     * @x-autobe-database-schema-property member
     * @x-autobe-specification Join from reddit_community_subscriptions.member_id to reddit_members.id, returns IRedditMember.ISummary
     */
    member: IRedditMember.ISummary;

    /**
     * Timestamp of when the subscription was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct timestamp from reddit_community_subscriptions.created_at
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp of when the subscription was last updated.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct timestamp from reddit_community_subscriptions.updated_at
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the subscription was marked for deletion (soft delete).
     *
     * @x-autobe-database-schema-property deleted_at
     * @x-autobe-specification Direct timestamp from reddit_community_subscriptions.deleted_at (nullable)
     */
    deleted_at: (string & tags.Format<"date-time">) | null;
  };
}
