import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPlatformReportReview } from "../../../../../../api/structures/ICommunityPlatformReportReview";
import { MemberAuth } from "../../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../../decorators/payload/MemberPayload";
import { postCommunityPlatformMemberCommunitiesCommunityIdReportsReportIdReviews } from "../../../../../../providers/postCommunityPlatformMemberCommunitiesCommunityIdReportsReportIdReviews";

@Controller(
  "/communityPlatform/member/communities/:communityId/reports/:reportId/reviews",
)
export class CommunityplatformMemberCommunitiesReportsReviewsController {
  /**
   * Create a moderation review record for a specific report in a specific community.
   *
   * This operation allows an authenticated community moderator to record a review decision against a report that belongs to the referenced community. In the business domain, reports are community-scoped governance entities that store the reporting member, the community scope, the member-provided reason, optional additional detail, and the current workflow status used by moderators to manage review queues. A report may target either a post or a comment through the normalized target tables for reported posts and reported comments, while each review action is preserved as a separate historical record in the report review table rather than overwriting prior activity.
   *
   * Access to this operation is restricted to a member who holds an active community moderation assignment for the referenced community. The moderation assignment is community-local and may represent an owner-linked standing or a moderator role, but it does not grant authority outside that specific community. The system must reject attempts to review reports from another community, attempts by members without an active moderation assignment, and attempts performed without a valid signed-in member session. This matches the requirement that moderation data for one community remains separate from other communities and that report handling occurs only within the related community context.
   *
   * The operation is backed by the community_platform_reports and community_platform_report_reviews tables. The parent report record stores the complaint reason, optional narrative detail, workflow status, and resolution summary, while the created review record stores the acting moderator assignment, the review action, and an optional moderator rationale note. Because the report review list is organized per community, the report identified by reportId must belong to the same community identified by communityId. If the report concerns a post, the report is reviewed in the community where that post was published. If the report concerns a comment, the report is reviewed in the community of the post that contains that comment.
   *
   * Business behavior depends on the submitted review action. When the moderator approves a valid report, the system must apply the moderation outcome to the targeted content and record the decision so the report no longer remains pending normal review. When the moderator dismisses a report, the system keeps the reported post or comment unchanged and removes the report from the active review list. If the targeted report does not exist, the request must be rejected. If the community context is unavailable, the report must not be presented as normal active content for moderation review. If the reported content no longer exists at the time of approval, the approval request must be rejected according to the review rules.
   *
   * This operation is typically used after the moderator has first obtained the community-specific review queue through the report review list endpoint for that community. The list view identifies pending reports for the moderator's community, and this creation endpoint records the actual moderation decision for one selected report. Clients should therefore treat this endpoint as the execution step of a community moderation workflow rather than as a general-purpose report mutation API.
   *
   * @param connection
   * @param communityId Target community's ID
   * @param reportId Target report's ID
   * @param body Review decision data for the target report
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Authenticate the caller as a signed-in member and
     *   resolve the member's active session identity. Reject the request when
     *   there is no valid member session.
   *
   * Load the community by communityId from community_platform_communities. Reject if the community does not exist or is not available for normal moderation context.
   *
   * Load the report by reportId from community_platform_reports, including its community reference, optional reportPost target with post, optional reportComment target with comment and comment.post, and existing review history if needed for workflow checks. Reject if the report does not exist.
   *
   * Verify that report.community_platform_community_id matches communityId. Reject cross-community access even if the caller moderates another community.
   *
   * Resolve the caller's active community moderation assignment from community_platform_community_moderators by community_platform_community_id = communityId, community_platform_member_id = authenticated member id, status indicating active assignment, and deleted_at is null. Allow both regular moderators and owner-linked assignments. Reject if no active assignment exists.
   *
   * Validate the request body fields against the DTO. The review_action value must represent a supported moderation decision such as approval or dismissal. Treat note as optional moderator rationale.
   *
   * For an approval action, determine the target content through the normalized report target subtype. If report.reportPost exists, load the referenced community_platform_posts row and confirm it still exists and is still associated with the same community. If report.reportComment exists, load the referenced community_platform_comments row and its parent post, then confirm the comment still exists and the enclosing post belongs to the same community. If the targeted content no longer exists at review time, reject the approval request.
   *
   * Execute the decision inside a transaction. Insert a row into community_platform_report_reviews with a new UUID, community_platform_report_id, community_platform_community_moderator_id, review_action, note, created_at, updated_at, and deleted_at null. Update community_platform_reports to reflect the new workflow state and resolution summary appropriate to the submitted decision.
   *
   * When the action is approval, apply the moderation effect to the targeted content according to its type. For a reported post, update the community_platform_posts record to the removed or moderated lifecycle state and set updated_at; if the implementation uses the existing lifecycle column for removal, also set deleted_at consistently with platform deletion handling. For a reported comment, update community_platform_comments similarly. Create a community_platform_moderation_actions audit row with action_type representing report review, linked to the acting moderator assignment and community. Create the associated community_platform_moderation_action_reports subtype row referencing the moderation action and the report. If additional target-specific moderation subtype records are part of the implementation architecture, populate them consistently.
   *
   * When the action is dismissal, do not modify the targeted post or comment. Still persist the review row, update the report status so it is excluded from active review results, set the appropriate dismissal resolution, and create the moderation action audit record for the review event.
   *
   * Return the created report review entity. The response should reflect the persisted review record rather than the report aggregate.
   *
   * Handle errors explicitly: 404-style rejection for missing community or missing report, 403-style rejection for callers without an active moderator assignment in the specified community, 409-style rejection when the report does not belong to the specified community or when approval is attempted after the reported content is already unavailable, and validation rejection for unsupported review_action values.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("communityId")
    communityId: string & tags.Format<"uuid">,
    @TypedParam("reportId")
    reportId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformReportReview.ICreate,
  ): Promise<ICommunityPlatformReportReview> {
    try {
      return await postCommunityPlatformMemberCommunitiesCommunityIdReportsReportIdReviews(
        {
          member,
          communityId,
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
