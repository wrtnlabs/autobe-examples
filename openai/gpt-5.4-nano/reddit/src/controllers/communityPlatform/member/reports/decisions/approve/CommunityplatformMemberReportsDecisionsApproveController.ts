import { TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPlatformReportResolution } from "../../../../../../api/structures/ICommunityPlatformReportResolution";
import { MemberAuth } from "../../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../../decorators/payload/MemberPayload";
import { postCommunityPlatformMemberReportsReportIdDecisionsApprove } from "../../../../../../providers/postCommunityPlatformMemberReportsReportIdDecisionsApprove";

@Controller("/communityPlatform/member/reports/:reportId/decisions/approve")
export class CommunityplatformMemberReportsDecisionsApproveController {
  /**
   * Approve a community report and apply the moderator decision to permanently remove the reported content from normal browsing.
   *
   * This operation is the moderation “approve” action for a single report identified by `reportId`. A report represents a user-submitted reason for reviewing a specific target within a community; its lifecycle is resolved by moderator actions.
   *
   * When a moderator approves a report, the platform must apply the approved outcome: the referenced target content (either a post or a comment, depending on the report’s target type and target identifier) is deleted from community visibility. After approval, the system must also ensure the report does not remain in the active report list for moderators (i.e., it is removed or updated so it no longer appears there for further action).
   *
   * This operation is implemented using the underlying moderation data model:
   *
   * - `community_platform_reports` stores the submitted report fields: `reporter_id`, `community_id`, `target_type`, `target_id`, and `reason`.
   * - `community_platform_report_targets` stores the target context for rendering and deterministic moderator review; the approval decision must be applied to the concrete target identified by `target_type` + `target_id`.
   * - `community_platform_report_resolutions` stores a single moderation resolution per report, enforcing that the report is resolved at most once via a unique constraint on `community_platform_report_id`.
   *
   * Security and authorization are strict. Access is permitted only when the caller is a moderator (or otherwise authorized moderator actor) for the `community_id` associated with the report. If the caller is not authorized to moderate that community, or if the caller attempts to approve a report they do not have authority over, the system must deny the action and must not change either the report list state or the reported content.
   *
   * Validation and edge-case expectations:
   *
   * - If the `reportId` does not correspond to an active report in the moderator’s view (for example, it has already been resolved and removed from the active list), the system must reject the request.
   * - Approving a report that has already been resolved must not apply conflicting outcomes; the system must prevent repeated/contradicting decisions so that the moderation side effects are applied consistently.
   * - The platform must ensure the approval outcome deterministically results in the reported post/comment being deleted and no longer appearing in community public lists.
   *
   * Related operations:
   *
   * - `POST /reports/{reportId}/decisions/dismiss` (or the equivalent dismiss action) performs the alternative moderator outcome where the reported content is kept and the dismissed report is removed from the moderator’s active report list.
   * - A moderator report listing endpoint (moderator view) should be used before calling this decision endpoint so clients can identify an active `reportId`.
   *
   * Content visibility after approval:
   *
   * - After this operation succeeds, the reported post/comment is deleted and will no longer appear in ordinary post/comment browsing.
   * - The report will not remain available for further moderation decisions in the active report list.
   *
   *
   * @param connection
   * @param reportId Identifier of the report to approve a moderation decision for.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification 1) Load the report by
     *   `community_platform_reports.id = reportId` and fetch its
     *   `community_id`, `target_type`, and `target_id`.
   *
   * 2) Authorization check:
   *    - Verify the caller is a moderator of the report’s `community_id` (use `community_platform_community_moderators` relationship; exact lookup to be implemented in service layer).
   *    - If the caller is not an authorized moderator for that community, reject with an authorization failure and do not perform any moderation side effects.
   *
   * 3) Active/report-list existence check:
   *    - Confirm the report is still pending in the active list (i.e., it does not already have an associated row in `community_platform_report_resolutions` with a non-deleted resolution).
   *    - If a resolution already exists (or the report has been removed from active list due to earlier dismissal/approval), reject the request (failure outcome must not change state).
   *
   * 4) Apply the decision transactionally:
   *    - Insert a `community_platform_report_resolutions` row with:
   *      - `community_platform_report_id = report.id`
   *      - `moderated_by_user_id = caller member id`
   *      - `resolution_decision = "approved"`
   *      - `moderation_note = <empty string or caller-provided note if supported by DTO>; since this endpoint has no request body, store an empty string literal or application-level default that matches schema type requirements>
   *      - `resolved_at = now()`
   *    - The insert must respect the unique constraint on `community_platform_report_id` so only one resolution can be applied.
   *
   * 5) Apply content deletion based on report target:
   *    - If `report.target_type` indicates a post target, delete the corresponding `community_platform_posts` record identified by `report.target_id`.
   *    - If `report.target_type` indicates a comment target, delete the corresponding `community_platform_comments` record identified by `report.target_id`.
   *    - Deletion must follow the platform’s defined deletion semantics for posts/comments (service layer should use the schema’s `deleted_at` and `deleted_by_id` columns if the system uses timestamp-based visibility). Only delete the specific content associated with this approved report.
   *
   * 6) Ensure post-conditions:
   *    - After successful approval, the reported content must no longer appear in public browsing queries.
   *    - The report must not appear in the moderator active report list. Achieve this by relying on the presence of the resolution row and/or updating list queries to exclude resolved reports.
   *
   * 7) Error handling:
   *    - If target content does not exist (deleted/invalid reference), reject the request as invalid target context; do not create a resolution row.
   *    - Any database transaction failure must roll back all changes.
   *
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async approveReportDecision(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("reportId")
    reportId: string & tags.Format<"uuid">,
  ): Promise<ICommunityPlatformReportResolution> {
    try {
      return await postCommunityPlatformMemberReportsReportIdDecisionsApprove({
        member,
        reportId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
