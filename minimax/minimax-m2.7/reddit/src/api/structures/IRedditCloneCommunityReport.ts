import { tags } from "typia";

import { IRedditCloneComment } from "./IRedditCloneComment";
import { IRedditCloneCommunityBan } from "./IRedditCloneCommunityBan";
import { IRedditCloneMemberSession } from "./IRedditCloneMemberSession";
import { IRedditClonePostLink } from "./IRedditClonePostLink";

export namespace IRedditCloneCommunityReport {
  /**
   * Request parameters for filtering and paginating community reports. Supports filtering by report status, target content type, and date range, with standard pagination controls.
   */
  export type IRequest = {
    /**
     * Filter by report status to show only reports with a specific status. Values: 'pending', 'approved', or 'dismissed'.
     *
     * @x-autobe-specification Maps to reddit_clone_community_reports.status column. Optional filter: 'pending', 'approved', or 'dismissed'. When provided, filters reports by exact status match.
     */
    status?: string | null | undefined;

    /**
     * Filter by content type being reported to show only posts or only comments. Values: 'post' or 'comment'.
     *
     * @x-autobe-specification Maps to reddit_clone_community_reports.target_type column. Optional filter: 'post' or 'comment'. When provided, filters reports by target content type.
     */
    targetType?: string | null | undefined;

    /**
     * Filter reports created on or after this date (inclusive). Format: ISO 8601 date-time string.
     *
     * @x-autobe-specification Computed filter on reddit_clone_community_reports.created_at column. When provided, filters for created_at >= startDate. Format: ISO 8601 date-time.
     */
    startDate?: string | null | undefined;

    /**
     * Filter reports created on or before this date (inclusive). Format: ISO 8601 date-time string.
     *
     * @x-autobe-specification Computed filter on reddit_clone_community_reports.created_at column. When provided, filters for created_at <= endDate. Format: ISO 8601 date-time.
     */
    endDate?: string | null | undefined;

    /**
     * Page number for pagination. Defaults to 1 if not provided.
     *
     * @x-autobe-specification Pagination parameter for page number (1-indexed). Defaults to 1 when null. Used with limit to calculate offset: offset = (page - 1) * limit.
     */
    page?: (number & tags.Type<"int32">) | null | undefined;

    /**
     * Number of items per page for pagination.
     *
     * @x-autobe-specification Pagination parameter for maximum items per page. When null, defaults to system page size. Used with page to calculate offset and determine response size.
     */
    limit?: (number & tags.Type<"int32">) | null | undefined;
  };

  /**
   * Request body for dismissing a pending report in a community. Contains optional resolution note explaining why the report was dismissed.
   */
  export type IDismiss = {
    /**
     * Optional note from the moderator explaining why the report was dismissed.
     *
     * @x-autobe-specification Direct mapping to reddit_clone_community_reports.resolution_note column. Server-side writes this value when provided. Maximum 1000 characters.
     * @x-autobe-database-schema-property resolution_note
     */
    resolution_note?: (string & tags.MaxLength<1000>) | null | undefined;
  };

  /**
   * Summary representation of a content report within a community for moderator review listing. Contains report details, reporter information, reported content preview, and resolution status when applicable.
   */
  export type IIndex = {
    /**
     * Unique identifier of the report.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_clone_community_reports.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Type of reported content.
     *
     * @x-autobe-database-schema-property target_type
     * @x-autobe-specification Direct mapping from reddit_clone_community_reports.target_type. Enum value: 'post' or 'comment'. Discriminator for polymorphic target_id.
     */
    targetType: "post" | "comment";

    /**
     * Identifier of the reported post or comment.
     *
     * @x-autobe-database-schema-property target_id
     * @x-autobe-specification Direct mapping from reddit_clone_community_reports.target_id. UUID of the reported post or comment. Combined with target_type to identify content.
     */
    targetId: string & tags.Format<"uuid">;

    /**
     * Preview of the reported content. Included for moderator review context.
     *
     * @x-autobe-specification Computed from target_type and target_id. If target_type is 'post', fetch reddit_clone_posts by target_id and return IRedditClonePost.ISummary. If target_type is 'comment', fetch reddit_clone_comments by target_id and return IRedditCloneComment.ISummary. This is a polymorphic union type.
     */
    targetPreview?:
      | IRedditClonePostLink.ISummary
      | IRedditCloneComment.ISummary
      | undefined;

    /**
     * User-provided reason for reporting the content.
     *
     * @x-autobe-database-schema-property reason
     * @x-autobe-specification Direct mapping from reddit_clone_community_reports.reason. Free-text explanation from reporter about why content violates community rules.
     */
    reason: string;

    /**
     * Current status of the report in the review workflow.
     *
     * @x-autobe-database-schema-property status
     * @x-autobe-specification Direct mapping from reddit_clone_community_reports.status. Enum values: 'pending' (awaiting review), 'approved' (content removed), 'dismissed' (no action taken).
     */
    status: "pending" | "approved" | "dismissed";

    /**
     * Optional note from the moderator explaining the resolution decision.
     *
     * @x-autobe-database-schema-property resolution_note
     * @x-autobe-specification Direct mapping from reddit_clone_community_reports.resolution_note. Nullable string. Set when moderator resolves the report.
     */
    resolutionNote?: string | null | undefined;

    /**
     * Timestamp when the report was resolved by a moderator.
     *
     * @x-autobe-database-schema-property resolved_at
     * @x-autobe-specification Direct mapping from reddit_clone_community_reports.resolved_at. Nullable timestamp. Set when moderator resolves the report.
     */
    resolvedAt?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Timestamp when the report was submitted.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from reddit_clone_community_reports.created_at. Non-nullable timestamp indicating when report was filed.
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Timestamp when the report was last updated.
     *
     * @x-autobe-specification Direct mapping from reddit_clone_community_reports.updated_at. Timestamp when the report was last updated.
     * @x-autobe-database-schema-property updated_at
     */
    updatedAt: string & tags.Format<"date-time">;

    /**
     * Member who filed this report.
     *
     * @x-autobe-database-schema-property reporter
     * @x-autobe-specification BELONGS-TO relation via reddit_clone_community_reports.reporter_id to reddit_clone_members.id. Returns IRedditCloneMember.ISummary with member's username for display.
     */
    reporter: IRedditCloneMemberSession.ISummary;

    /**
     * Community where the report was filed.
     *
     * @x-autobe-database-schema-property community
     * @x-autobe-specification BELONGS-TO relation via reddit_clone_community_reports.reddit_clone_community_id to reddit_clone_communities.id. Returns IRedditCloneCommunity.ISummary with community name for context.
     */
    community: IRedditCloneCommunityBan.ISummary;

    /**
     * Moderator who resolved this report. Null when report is pending.
     *
     * @x-autobe-database-schema-property resolvedBy
     * @x-autobe-specification BELONGS-TO relation via reddit_clone_community_reports.resolved_by_id to reddit_clone_members.id. Nullable. Returns IRedditCloneMember.ISummary when report is resolved, null when pending.
     */
    resolvedBy?: IRedditCloneMemberSession.ISummary | null | undefined;
  };
}
