import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIRedditPlatformModerationAuditLog } from "../../../../../api/structures/IPageIRedditPlatformModerationAuditLog";
import { IRedditPlatformModerationAuditLog } from "../../../../../api/structures/IRedditPlatformModerationAuditLog";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { getRedditPlatformMemberCommunitiesCommunityIdModerationAuditLogsLogId } from "../../../../../providers/getRedditPlatformMemberCommunitiesCommunityIdModerationAuditLogsLogId";
import { patchRedditPlatformMemberCommunitiesCommunityIdModerationAuditLogs } from "../../../../../providers/patchRedditPlatformMemberCommunitiesCommunityIdModerationAuditLogs";

@Controller(
  "/redditPlatform/member/communities/:communityId/moderation-audit-logs",
)
export class RedditplatformMemberCommunitiesModeration_audit_logsController {
  /**
   * Retrieve a filtered and paginated list of moderation audit logs for a specific community.
   *
   * This endpoint provides community moderators with comprehensive visibility into all moderation actions taken within their assigned community, enabling oversight, compliance auditing, and transparency reporting. The audit log system tracks every moderation action including moderator appointments and removals, post and comment deletions, user bans and unbans, and report resolution actions (approvals and dismissals).
   *
   * The returned audit log entries contain detailed information about each action, including which moderator performed it, when it occurred, what entity was affected (post, comment, or user), the action type, optional reason provided by the moderator, and structured details in JSON format that may include additional context like previous moderator status or ban expiration dates.
   *
   * Filtering capabilities include date range queries (created_at), action type filtering (appoint_moderator, remove_moderator, delete_post, delete_comment, ban_user, unban_user, approve_report, dismiss_report), moderator filtering, and text search within action reasons using trigram indexes for fuzzy matching.
   *
   * The operation returns paginated results with cursor-based or offset-based pagination including total count for UI navigation. Results are sorted by creation timestamp in descending order (newest first) by default, with optional sorting by action type or moderator.
   *
   * This endpoint is restricted exclusively to moderators of the specified community. Regular members without moderator privileges and guests cannot access audit logs to maintain moderation workflow integrity and prevent potential moderator harassment or intimidation. Access verification is performed by checking the `reddit_platform_community_moderators` table for the authenticated user's membership in the community's moderator roster.
   *
   * @param connection
   * @param communityId Unique identifier of the community whose moderation audit logs to retrieve
   * @param body Filter criteria, sorting options, and pagination parameters for the audit log query
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Query the reddit_platform_moderation_audit_logs table for the specified community_id.
   *
   * 1. Authorization check: Verify the requesting user is a moderator of the specified community by checking reddit_platform_community_moderators table where community_id matches and member_id equals the authenticated user's ID.
   *
   * 2. Apply filters from requestBody:
   *    - startDate and endDate: Filter by created_at between these timestamps
   *    - actionType: Filter by exact action_type match (appoint_moderator, remove_moderator, delete_post, delete_comment, ban_user, unban_user, approve_report, dismiss_report)
   *    - moderatorId: Filter by specific moderator who performed the action
   *    - searchQuery: Text search within action_reason field using trigram index (action_details(ops: raw("gin_trgm_ops"))) for fuzzy matching
   *    - sortBy and sortOrder: Sort by created_at (default: DESC), action_type, or moderator_id
   *
   * 3. Apply pagination:
   *    - page and limit parameters for offset-based pagination
   *    - OR cursor-based pagination using lastId for pagination from a specific point
   *    - Calculate total count for UI navigation
   *
   * 4. Join with reddit_platform_members for moderator display name and display_name.
   *
   * 5. Handle polymorphic target references:
   *    - Include action_target_post_id, action_target_comment_id, action_target_user_id in response
   *    - Resolve target entity type (post/comment/user) from action_target_type field
   *    - When specific FK is null but action_target_id exists, use polymorphic reference
   *
   * 6. Handle soft delete: Filter out entries where deleted_at is not null to exclude archived logs.
   *
   * 7. Error handling:
   *    - Return 404 if community does not exist
   *    - Return 403 if user is not a moderator of the community
   *    - Return 400 if pagination parameters are invalid (negative page, limit > max allowed)
   *    - Return 400 if date range is invalid (startDate > endDate)
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communityId")
    communityId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IRedditPlatformModerationAuditLog.IRequest,
  ): Promise<IPageIRedditPlatformModerationAuditLog.ISummary> {
    try {
      return await patchRedditPlatformMemberCommunitiesCommunityIdModerationAuditLogs(
        {
          member,
          communityId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve detailed information about a specific moderation action within a community.
   *
   * This operation provides access to moderator audit logs, which serve as a compliance and transparency record of all moderation actions taken within a community. Each log entry documents who performed the moderation action, what content or user was affected, when the action occurred, and the reason provided by the moderator.
   *
   * The operation requires moderator authentication and access control. Users can only view audit logs for communities where they hold moderator privileges, as established in the community_moderators relationship. This ensures that sensitive moderation decisions are only visible to authorized community moderators while maintaining an audit trail for accountability.
   *
   * Only active (non-deleted) audit log entries are returned. Soft-deleted records are excluded from results in accordance with the database schema's soft delete pattern using the deleted_at timestamp field.
   *
   * Audit log entries cover actions such as appointing or removing moderators, deleting posts or comments, banning or unbanning users, and approving or dismissing content reports. Each entry includes structured action details in JSON format for programmatic analysis and reporting.
   *
   * This endpoint is typically used by moderators to review past moderation decisions, provide transparency to community discussions when appropriate, or generate compliance reports for community ownership.
   *
   * @param connection
   * @param communityId The UUID of the community where the moderation action occurred. The user must have moderator privileges for this community.
   * @param logId The UUID of the moderation audit log entry to retrieve.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Retrieve a single moderation audit log entry by log ID. Validate that the authenticated user has moderator privileges for the specified community by checking reddit_platform_community_moderators table. Query reddit_platform_moderation_audit_logs by log ID and community ID. Load associated moderator user details and action target references (post, comment, or user) if applicable. Return full audit log object with action_type, action_reason, action_details JSON, and created_at timestamp. If user lacks moderator privileges for the community, return 403 Forbidden. If log ID does not exist or belongs to different community, return 404 Not Found.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":logId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communityId")
    communityId: string & tags.Format<"uuid">,
    @TypedParam("logId")
    logId: string & tags.Format<"uuid">,
  ): Promise<IRedditPlatformModerationAuditLog> {
    try {
      return await getRedditPlatformMemberCommunitiesCommunityIdModerationAuditLogsLogId(
        {
          member,
          communityId,
          logId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
