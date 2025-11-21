import { tags } from "typia";

import { ICommunityPlatformMember } from "./ICommunityPlatformMember";
import { ICommunityPlatformModerator } from "./ICommunityPlatformModerator";
import { ICommunityPlatformAdmin } from "./ICommunityPlatformAdmin";
import { ICommunityPlatformComment } from "./ICommunityPlatformComment";

export namespace ICommunityPlatformCommentReport {
  /**
   * Search criteria and pagination parameters for comment report filtering in
   * community platform moderation operations.
   *
   * Provides comprehensive filtering capabilities for moderators and
   * administrators to efficiently manage comment reports across the platform.
   * Supports multiple criteria including report status workflow tracking,
   * reporter type classification, date ranges for creation and resolution
   * analysis, keyword search in violation descriptions, and specific reporter
   * identification.
   *
   * The operation integrates with the community_platform_comment_reports
   * Prisma schema table structure, supporting complex query patterns that
   * align with moderation workflow requirements. Filter parameters are
   * designed for optimal performance in large-scale moderation systems while
   * maintaining flexibility for detailed report analysis.
   *
   * Used primarily in moderation dashboard interfaces, audit trail reporting,
   * and administrative oversight operations. The request DTO follows the
   * standard .IRequest pattern for search operations with all optional
   * parameters to support diverse filtering scenarios without mandatory
   * constraints.
   */
  export type IRequest = {
    /**
     * Page number for pagination, starting from 1. Controls result set
     * navigation through large collections of comment reports for efficient
     * moderation workflow management.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of items per page, maximum 100. Balances performance and
     * usability by controlling result set size in moderation interface
     * displays.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Filter by report status (pending, reviewing, resolved, dismissed).
     * Enables workflow-specific filtering for different moderation stages
     * and priority management.
     */
    status?: string | undefined;

    /**
     * Filter by type of reporter (member, moderator, admin). Supports
     * analysis of reporting patterns across different user roles and
     * privilege levels.
     */
    reporter_type?: string | undefined;

    /**
     * Start date for filtering reports by creation date. Enables time-based
     * analysis of reporting trends and backlog management.
     */
    created_at_start?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End date for filtering reports by creation date. Defines the upper
     * boundary for time-based report filtering operations.
     */
    created_at_end?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Start date for filtering reports by resolution date. Supports
     * analysis of moderation response times and resolution efficiency
     * metrics.
     */
    resolved_at_start?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End date for filtering reports by resolution date. Enables tracking
     * of moderation throughput and historical resolution patterns.
     */
    resolved_at_end?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Keyword search in report reasons and details. Supports text-based
     * content filtering for efficient moderation workflow navigation.
     */
    search?: string | undefined;

    /**
     * Filter by specific content within report details field. Enables
     * targeted search within user-provided report context and violation
     * descriptions.
     */
    report_details?: string | undefined;

    /**
     * Filter by moderator resolution text. Supports analysis of moderation
     * decisions and pattern recognition in resolution approaches.
     */
    resolution?: string | undefined;

    /**
     * Filter by specific member reporter. Enables targeted analysis of
     * reporting behavior from individual community members.
     */
    reporter_member?: ICommunityPlatformMember.ISummary | undefined;

    /**
     * Filter by specific moderator reporter. Supports internal moderation
     * coordination and cross-moderation reporting analysis.
     */
    reporter_moderator?: ICommunityPlatformModerator.ISummary | undefined;

    /**
     * Filter by specific administrator reporter. Enables administrative
     * oversight and system-wide reporting pattern analysis.
     */
    reporter_admin?: ICommunityPlatformAdmin.ISummary | undefined;

    /**
     * Direct filter by member reporter identifier. Provides efficient
     * lookup capability for specific member reporting history.
     */
    reporter_member_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Direct filter by moderator reporter identifier. Supports internal
     * moderation workflow tracking and accountability.
     */
    reporter_moderator_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Direct filter by administrator reporter identifier. Enables
     * administrative audit trail and system management reporting.
     */
    reporter_admin_id?: (string & tags.Format<"uuid">) | undefined;
  };

  /**
   * Summary view of comment reports for list displays and quick reference.
   *
   * Provides essential information about comment reports including the
   * reported comment context, suitable for moderation queues and overview
   * displays. Includes violation category, current status, and submission
   * timestamp for efficient moderation workflow management.
   */
  export type ISummary = {
    /** Primary key identifier for the comment report record. */
    id: string & tags.Format<"uuid">;

    /** Category or description of the violation being reported. */
    report_reason: string;

    /** Current status of the report in the moderation workflow. */
    status: string;

    /** Timestamp when the report was filed. */
    created_at: string & tags.Format<"date-time">;

    /** The comment being reported, providing context for moderation review. */
    comment: ICommunityPlatformComment.ISummary;
  };
}
