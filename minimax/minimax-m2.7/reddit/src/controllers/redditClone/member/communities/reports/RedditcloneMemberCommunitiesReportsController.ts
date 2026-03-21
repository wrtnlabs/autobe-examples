import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIRedditCloneCommunityReport } from "../../../../../api/structures/IPageIRedditCloneCommunityReport";
import { IRedditCloneCommunityReport } from "../../../../../api/structures/IRedditCloneCommunityReport";
import { IRedditCloneReport } from "../../../../../api/structures/IRedditCloneReport";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { deleteRedditCloneMemberCommunitiesCommunityNameReportsReportId } from "../../../../../providers/deleteRedditCloneMemberCommunitiesCommunityNameReportsReportId";
import { getRedditCloneMemberCommunitiesCommunityNameReportsReportId } from "../../../../../providers/getRedditCloneMemberCommunitiesCommunityNameReportsReportId";
import { patchRedditCloneMemberCommunitiesCommunityNameReports } from "../../../../../providers/patchRedditCloneMemberCommunitiesCommunityNameReports";
import { postRedditCloneMemberCommunitiesCommunityNameReports } from "../../../../../providers/postRedditCloneMemberCommunitiesCommunityNameReports";
import { putRedditCloneMemberCommunitiesCommunityNameReportsReportId } from "../../../../../providers/putRedditCloneMemberCommunitiesCommunityNameReportsReportId";

@Controller("/redditClone/member/communities/:communityName/reports")
export class RedditcloneMemberCommunitiesReportsController {
  /**
   * Submit a report against a post or comment within a community.
   *
   * This endpoint allows authenticated members to report content that violates community guidelines or platform rules. Reports are scoped to the community where the reported content exists, ensuring they are routed to the appropriate moderators for review.
   *
   * When a member submits a report, they must identify the target content (either a post or comment) and provide a textual reason explaining why the content is problematic. The system automatically records the reporter's identity and associates the report with the specified community.
   *
   * Business rules enforced:
   * - Members cannot report their own content (validation error returned)
   * - Members cannot submit multiple reports for the same piece of content (unique constraint violation)
   * - Reports are immutable after submission (reason cannot be modified)
   * - Report status defaults to 'pending' awaiting moderator review
   *
   * Moderators who manage the community can view submitted reports in their moderation queue, seeing the reported content, reporter identity, reason, and submission timestamp.
   *
   * Related operations:
   * - GET /communities/{communityName}/reports - View community reports (moderators only)
   * - POST /reports/{reportId}/approve - Approve report and remove content
   * - POST /reports/{reportId}/dismiss - Dismiss report and keep content
   *
   * @param connection
   * @param communityName Name of the community where the reported content exists
   * @param body Report creation details including target content and reason
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Create a new content report within a community.
   *
   * 1. Authentication: Extract authenticated member ID from request session. Return 401 if not authenticated.
   *
   * 2. Community Resolution: Look up community by name (communityName path parameter). Return 404 if not found.
   *
   * 3. Request Body Validation:
   *    - targetType: Required string, must be 'post' or 'comment'
   *    - targetId: Required UUID string identifying the content to report
   *    - reason: Required string, minimum 1 character, maximum 1000 characters
   *
   * 4. Target Content Validation:
   *    - If targetType is 'post': Verify post exists with targetId and belongs to the specified community. Return 404 if not found.
   *    - If targetType is 'comment': Verify comment exists with targetId. Return 404 if not found.
   *
   * 5. Self-Reporting Prevention:
   *    - If targetType is 'post': Compare post.reddit_clone_member_id with authenticated member ID. Return 403 if same.
   *    - If targetType is 'comment': Compare comment.reddit_clone_member_id with authenticated member ID. Return 403 if same.
   *
   * 6. Duplicate Report Prevention:
   *    - Query reddit_clone_reports for existing report where reddit_clone_member_id = authenticated member AND target_type = targetType AND target_id = targetId
   *    - Return 409 Conflict if duplicate exists
   *
   * 7. Report Creation:
   *    - Insert into reddit_clone_reports:
   *      - id: Generate new UUID
   *      - reddit_clone_member_id: authenticated member ID
   *      - reddit_clone_community_id: resolved community ID
   *      - target_type: targetType from request
   *      - target_id: targetId from request
   *      - reason: reason from request
   *      - status: 'pending'
   *      - created_at: Current timestamp
   *      - updated_at: Current timestamp
   *
   * 8. Return 201 Created with the created report object (full IRedditCloneReport structure).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communityName")
    communityName: string,
    @TypedBody()
    body: IRedditCloneReport.ICreate,
  ): Promise<IRedditCloneReport> {
    try {
      return await postRedditCloneMemberCommunitiesCommunityNameReports({
        member,
        communityName,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered and paginated list of content reports within a specific community.
   *
   * This endpoint allows moderators to view all reports submitted for posts and comments in communities they moderate. The operation supports filtering by report status, target type (post or comment), and date range. Results are sorted by submission date with most recent reports appearing first.
   *
   * Reports contain information about the reported content (post title and content or comment content), the username of the reporter, the reason provided, and the type of content being reported. Moderators can see which user submitted each report as per business rules.
   *
   * Authorization: Only authenticated moderators of the specified community can access this endpoint. The system SHALL NOT return reports for communities the requesting user does not moderate.
   *
   * Related Operations:
   * - POST /communities/{communityName}/reports/:reportId/approve - Approve a report and delete the reported content
   * - POST /communities/{communityName}/reports/:reportId/dismiss - Dismiss a report and keep the content
   * - POST /posts/:postId/report - Submit a report for a post
   * - POST /comments/:commentId/report - Submit a report for a comment
   *
   * @param connection
   * @param communityName Unique name identifier of the community (e.g., 'askreddit', 'funny')
   * @param body Search and filter criteria with pagination parameters
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1. Validate the authenticated user is a moderator of the specified community
   * 2. Query reddit_clone_community_reports table filtered by community_id (resolved via communityName)
   * 3. Apply optional filters:
   *    - status: filter by 'pending', 'approved', or 'dismissed'
   *    - target_type: filter by 'post' or 'comment'
   *    - date range: created_at between start and end timestamps
   * 4. Join with reddit_clone_members to include reporter username
   * 5. Join with reddit_clone_posts (when target_type='post') or reddit_clone_comments (when target_type='comment') to include reported content details
   * 6. Order by created_at DESC (most recent first)
   * 7. Apply pagination with page and limit parameters
   * 8. Return paginated results with ISummary containing report details, reporter info, and reported content preview
   *
   * Edge Cases:
   * - Return 403 if user is not a moderator of the community
   * - Return empty page if no reports exist for the community
   * - Handle mixed target_types in joined queries appropriately
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communityName")
    communityName: string,
    @TypedBody()
    body: IRedditCloneCommunityReport.IRequest,
  ): Promise<IPageIRedditCloneCommunityReport.IIndex> {
    try {
      return await patchRedditCloneMemberCommunitiesCommunityNameReports({
        member,
        communityName,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve detailed information about a specific report within a community.
   *
   * This endpoint allows moderators to view the complete details of a single report filed against content within their community. The report details include the identity of the reporter, the reported content (either a post or comment), the reason provided, and the current status of the report.
   *
   * Authorization is scoped to the community specified in the path. Only users who have moderator privileges for that community can access the report details. The system enforces that moderators SHALL only see reports for content within communities they moderate, as defined in report processing rules.
   *
   * The reported content is resolved polymorphically based on the target_type field from the reddit_clone_reports table, which discriminates between post and comment targets. When the target is a post, the response includes the post title and content. When the target is a comment, the response includes the comment content.
   *
   * The reporter's identity is visible to moderators, allowing them to identify patterns of reporting behavior from specific users. However, when a report is approved or dismissed, the system SHALL NOT send any notification to the reporting user.
   *
   * Report immutability is enforced: once a report is submitted, the system SHALL NOT allow modification of the reason text. This endpoint provides read-only access to report data.
   *
   * This operation relates to other report management endpoints: PATCH /redditClone/member/communities/{communityName}/reports for listing all reports, POST /redditClone/member/reports/{reportId}/approve for approving reports, and POST /redditClone/member/reports/{reportId}/dismiss for dismissing reports.
   *
   * @param connection
   * @param communityName Unique name of the community (e.g., 'askreddit', 'funny'). Used for authorization scoping to ensure moderators can only view reports for communities they moderate.
   * @param reportId Unique identifier of the report to retrieve.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1. Extract communityName from path parameter and reportId from path parameter.
   *
   * 2. Verify the authenticated user has moderator privileges for the specified community:
   *    - Query reddit_clone_community_moderators table to check if user is moderator or owner of the community
   *    - Return 403 Forbidden if user is not a moderator for this community
   *
   * 3. Query reddit_clone_reports table to find the report by reportId:
   *    - WHERE id = reportId AND reddit_clone_community_id matches the community
   *    - Return 404 Not Found if report does not exist or belongs to different community
   *
   * 4. Resolve the reported content based on target_type:
   *    - If target_type = 'post': JOIN with reddit_clone_posts to get post title, content from reddit_clone_post_text_contents
   *    - If target_type = 'comment': JOIN with reddit_clone_comments to get comment content
   *    - For posts, also join with reddit_clone_members to get author username
   *    - For comments, join with reddit_clone_members to get author username
   *
   * 5. Resolve reporter identity:
   *    - JOIN with reddit_clone_members to get reporter's username
   *
   * 6. Construct the response with:
   *    - Report ID, status, reason, created_at, updated_at
   *    - Reporter username
   *    - Target type (post/comment)
   *    - Target content details (title and content for posts, content for comments)
   *    - Target author username
   *    - Target ID
   *
   * 7. Return 200 OK with IRedditCloneReport response body.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":reportId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communityName")
    communityName: string,
    @TypedParam("reportId")
    reportId: string & tags.Format<"uuid">,
  ): Promise<IRedditCloneReport> {
    try {
      return await getRedditCloneMemberCommunitiesCommunityNameReportsReportId({
        member,
        communityName,
        reportId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update the status of a report within a specific community.
   *
   * This operation allows moderators to modify the status of a user-submitted report. The report status determines the outcome of the moderation workflow: 'approved' status results in the reported content being removed, while 'dismissed' status keeps the content in place.
   *
   * The operation is scoped to the community identified by {communityName}, ensuring moderators can only act on reports within communities they have moderation privileges for. This aligns with the community scope restriction from the Report Processing Rules: "Moderators SHALL only see reports for content within communities they moderate."
   *
   * When a report status is changed to 'approved', the system SHALL remove the reported content (either post or comment) by soft-deleting the content record without adjusting any karma scores for previously cast votes on that content. This follows the rule: "WHEN content is removed following report approval, THE system SHALL NOT adjust any karma scores for votes that were previously cast on the removed content."
   *
   * Report reason text cannot be modified after submission, as enforced by the rule: "ONCE a report has been submitted, THE system SHALL NOT allow the reporting user to modify the reason text." Only the status field is modifiable through this endpoint.
   *
   * The response returns the complete updated report entity including the reporter identity (username), reported content details, reason, and new status. This enables moderators to confirm the status change and view the updated report state.
   *
   * Related API Operations:
   * - GET /communities/{communityName}/reports - List all reports for the community
   * - POST /communities/{communityName}/reports - Create a new report
   * - GET /communities/{communityName}/reports/{reportId} - Get a single report
   *
   * This operation does NOT require pre-execution of other API operations.
   *
   * Authorization: Only members with moderator privileges in the specified community can update reports.
   *
   * @param connection
   * @param communityName The unique name of the community (URL-safe slug) that owns this report, scoped to global uniqueness.
   * @param reportId Unique identifier of the report to update.
   * @param body Update request containing the new status for the report. Only status field is modifiable.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification ## Implementation Specification
   *
   * ### Service Layer Logic
   *
   * 1. **Authorization Check**:
   *    - Verify the authenticated member has moderator privileges in the community identified by communityName
   *    - Query reddit_clone_community_moderators to confirm moderator status
   *    - Reject with 403 Forbidden if not a moderator
   *
   * 2. **Report Existence and Ownership**:
   *    - Query reddit_clone_reports by reportId
   *    - Verify the report belongs to the specified community (reddit_clone_community_id matches)
   *    - Reject with 404 Not Found if report does not exist or belongs to different community
   *
   * 3. **Validate Status Transition**:
   *    - Accept only 'approved' or 'dismissed' as valid status values
   *    - Ensure report is currently in 'pending' status before allowing update
   *    - Reject updates to already processed reports (approved/dismissed)
   *
   * 4. **Content Removal (if approved)**:
   *    - If new status is 'approved', retrieve the reported content using polymorphic reference (target_type, target_id)
   *    - Remove the content from the appropriate table (reddit_clone_posts or reddit_clone_comments)
   *    - Do NOT adjust karma scores for existing votes on the removed content
   *    - Log the content removal in audit trail
   *
   * 5. **Update Report Record**:
   *    - Update the status field in reddit_clone_reports
   *    - Update the updated_at timestamp
   *    - Record the moderator who processed the report (optional moderator_notes field)
   *
   * 6. **Return Updated Report**:
   *    - Return the complete updated report entity with all fields
   *    - Include reporter username, community name, content details, reason, and new status
   *
   * ### Database Queries
   *
   * ```sql
   * -- Verify moderator status
   * SELECT m.id FROM reddit_clone_community_moderators m
   * JOIN reddit_clone_communities c ON m.reddit_clone_community_id = c.id
   * WHERE c.name = :communityName AND m.reddit_clone_member_id = :memberId;
   *
   * -- Get report with details
   * SELECT r.*, m.username as reporter_username,
   *        c.name as community_name
   * FROM reddit_clone_reports r
   * JOIN reddit_clone_members m ON r.reddit_clone_member_id = m.id
   * JOIN reddit_clone_communities c ON r.reddit_clone_community_id = c.id
   * WHERE r.id = :reportId AND c.name = :communityName;
   *
   * -- Update report status
   * UPDATE reddit_clone_reports
   * SET status = :newStatus, updated_at = NOW()
   * WHERE id = :reportId;
   *
   * -- Delete content if approved
   * DELETE FROM reddit_clone_posts WHERE id = :targetId; -- or
   * DELETE FROM reddit_clone_comments WHERE id = :targetId;
   * ```
   *
   * ### Edge Cases and Error Handling
   *
   * 1. **Non-existent report**: Return 404 with error message "Report not found"
   * 2. **Unauthorized moderator**: Return 403 with error message "You do not have moderator privileges in this community"
   * 3. **Already processed report**: Return 400 with error message "Report has already been processed"
   * 4. **Invalid status value**: Return 400 with validation error
   * 5. **Report belongs to different community**: Return 404 (not 403 to prevent enumeration)
   *
   * ### Transaction Handling
   *
   * Wrap the entire operation in a database transaction:
   * - Atomically update report status and delete content (if approved)
   * - Rollback on any failure to maintain data consistency
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":reportId")
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communityName")
    communityName: string,
    @TypedParam("reportId")
    reportId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IRedditCloneReport.IUpdate,
  ): Promise<IRedditCloneReport> {
    try {
      return await putRedditCloneMemberCommunitiesCommunityNameReportsReportId({
        member,
        communityName,
        reportId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Dismiss a pending report in a community, removing it from the active report queue.
   *
   * This endpoint allows moderators to dismiss reports that do not warrant action against the reported content. When a report is dismissed, the reported content (post or comment) remains visible to users, but the report is removed from the moderator's pending queue.
   *
   * The dismissal is scoped to the specific community identified by the path parameter. Only users with moderator privileges in that community can dismiss reports. The system verifies the report exists and belongs to the specified community before processing the dismissal.
   *
   * The moderator performing the dismissal can optionally include a resolution note explaining why the report was dismissed. Once dismissed, the report status changes to 'dismissed' and is no longer visible in the pending reports list.
   *
   * **Authorization**: Only community moderators or owners can dismiss reports. The system enforces community scope for report viewing and actions as specified in the report processing rules.
   *
   * **Database Entity**: This operation targets the reddit_clone_community_reports table which stores content reports with reporter information, target content reference (via polymorphic target_type and target_id), reason text, and status workflow.
   *
   * @param connection
   * @param communityName Unique name of the community (scoped globally unique)
   * @param reportId Unique identifier of the report to dismiss
   * @param body Optional dismissal details including resolution note
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1. Extract communityName from path parameter and validate it exists in reddit_clone_communities table.
   * 2. Extract reportId from path parameter as UUID.
   * 3. Verify the authenticated user has moderator privileges in the specified community:
   *    - Query reddit_clone_community_moderators table to confirm membership
   *    - Return 403 Forbidden if user is not a moderator in this community
   * 4. Retrieve the report from reddit_clone_community_reports:
   *    - Filter by id = reportId AND reddit_clone_community_id matching the community
   *    - Filter by status = 'pending' (only pending reports can be dismissed)
   *    - Return 404 Not Found if report does not exist or is not pending
   * 5. Validate optional resolution_note if provided in request body:
   *    - Maximum length: 1000 characters
   *    - Sanitize HTML/script content
   * 6. Update the report record:
   *    - Set status = 'dismissed'
   *    - Set resolved_by_id to the authenticated moderator's user ID
   *    - Set resolved_at to current timestamp
   *    - Set resolution_note if provided
   * 7. Return 200 OK with the updated report data including:
   *    - Report ID, target content info, reason, dismissal timestamp
   *    - Moderator who dismissed the report
   *
   * **Transaction**: Wrap steps 4-6 in a database transaction to ensure atomic status update.
   *
   * **Edge Cases**:
   * - Report already approved → return 400 Bad Request
   * - Report already dismissed → return 409 Conflict
   * - User not a moderator → return 403 Forbidden
   * - Report belongs to different community → return 404 Not Found
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":reportId")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communityName")
    communityName: string,
    @TypedParam("reportId")
    reportId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IRedditCloneCommunityReport.IDismiss,
  ): Promise<void> {
    try {
      return await deleteRedditCloneMemberCommunitiesCommunityNameReportsReportId(
        {
          member,
          communityName,
          reportId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
