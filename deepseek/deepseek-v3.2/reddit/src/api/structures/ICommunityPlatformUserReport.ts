import { tags } from "typia";

import { ICommunityPlatformCommunity } from "./ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "./ICommunityPlatformMember";

export namespace ICommunityPlatformUserReport {
  /**
   * Summary view of a user-submitted content report for moderation interfaces, showing essential report details including status, reason, timestamps, reporter, and community context. Used for listing reports in moderation dashboards.
   */
  export type ISummary = {
    /**
     * Unique identifier for the user report.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from community_platform_user_reports.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Required explanation from reporter describing why the content violates community guidelines.
     *
     * @x-autobe-database-schema-property reason
     * @x-autobe-specification Direct mapping from community_platform_user_reports.reason. Required explanation from reporter describing why content violates community guidelines.
     */
    reason: string;

    /**
     * Current state in the report lifecycle: pending, approved, dismissed, or resolved.
     *
     * @x-autobe-database-schema-property status
     * @x-autobe-specification Direct mapping from community_platform_user_reports.status. Valid values: 'pending' (awaiting review), 'approved' (moderator approved, content deleted), 'dismissed' (moderator dismissed, content kept), 'resolved' (action taken, resolved).
     */
    status: string;

    /**
     * Timestamp when the report was submitted by the user.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from community_platform_user_reports.created_at. Timestamp when the report was submitted by the user.
     */
    created_at: string;

    /**
     * Timestamp when the report was last modified.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from community_platform_user_reports.updated_at. Timestamp when the report was last modified (status change, note addition, etc.).
     */
    updated_at: string;

    /**
     * The member who submitted this report.
     *
     * @x-autobe-database-schema-property reporter
     * @x-autobe-specification Join from community_platform_user_reports.reporter_member_id to community_platform_members.id. Returns ISummary view of member.
     */
    reporter: ICommunityPlatformMember.ISummary;

    /**
     * The community where the reported content resides.
     *
     * @x-autobe-database-schema-property community
     * @x-autobe-specification Join from community_platform_user_reports.community_id to community_platform_communities.id. Returns ISummary view of community.
     */
    community: ICommunityPlatformCommunity.ISummary;
  };
}
