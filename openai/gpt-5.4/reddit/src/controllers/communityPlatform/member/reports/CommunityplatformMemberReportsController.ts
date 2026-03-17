import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPlatformReport } from "../../../../api/structures/ICommunityPlatformReport";
import { IPageICommunityPlatformReport } from "../../../../api/structures/IPageICommunityPlatformReport";
import { MemberAuth } from "../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../decorators/payload/MemberPayload";
import { getCommunityPlatformMemberReportsReportId } from "../../../../providers/getCommunityPlatformMemberReportsReportId";
import { patchCommunityPlatformMemberReports } from "../../../../providers/patchCommunityPlatformMemberReports";
import { postCommunityPlatformMemberReports } from "../../../../providers/postCommunityPlatformMemberReports";

@Controller("/communityPlatform/member/reports")
export class CommunityplatformMemberReportsController {
  /**
   * Create a new moderation report for a post or comment within the community platform.
   *
   * This operation allows an authenticated member to submit a formal content complaint for moderator review. The created record belongs to the moderation domain centered on `community_platform_reports`, which stores formal reports submitted against community content. The reported target is bound through exactly one target-specific subtype relation: `community_platform_report_posts` for a reported post or `community_platform_report_comments` for a reported comment. This matches the requirement that a report is a formal complaint tied to published community content and routed into the appropriate community moderation workflow.
   *
   * The community scope of the report is derived from the reported content, not chosen freely by the caller. When the target is a post, the service must resolve the post and use its community context. When the target is a comment, the service must resolve the comment and then the owning post so the report is placed into the review list of the related community. This behavior is required so moderators see only reports for communities they moderate and so report review remains separated by community.
   *
   * Only authenticated members may submit reports. The caller becomes the reporting member recorded on the report, and the request must provide the complaint reason required by the reporting rules. If additional explanatory detail is supported by the DTO, it may be stored as supplementary moderator context. Initial review-state values are controlled by the server as part of the moderation intake workflow and must not be trusted from client input.
   *
   * This endpoint is the intake step for later moderator-facing review operations. After creation, the report becomes eligible for inclusion in the moderator report review list for the related community, where moderators can inspect the reported content, the reporting member identity, and the submitted reason. The operation creates reporting data only and does not itself perform any moderator review decision.
   *
   * The service must reject requests from unauthenticated or unauthorized callers, reject submissions without the required reason, and reject attempts to report a post or comment that does not exist. It must also reject targets that cannot be resolved to a valid community moderation context. Successful execution creates the report and its target-binding record without modifying the reported content itself.
   *
   * @param connection
   * @param body The member's report submission payload identifying a reported post or comment and the complaint reason.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Authenticate the caller as a member and use the authenticated member ID as the reporter identity. Do not accept reporter identity, community identity, report status, or resolution from the client.
   *
   * Parse `ICommunityPlatformReport.ICreate` to determine whether the target is a post or a comment. The request DTO should carry a discriminator-like target type and a target identifier plus the required reason and optional detail. Validate that exactly one target kind is supplied.
   *
   * If the target is a post, query `community_platform_posts` by ID, ensuring the post exists and is in a reportable lifecycle state according to business rules. Read its `community_platform_community_id` and create a row in `community_platform_reports` with `community_platform_member_id` set to the authenticated member, `community_platform_community_id` set from the post, `reason` and `detail` from the request, an initial workflow `status` such as open, `resolution` as null, and current timestamps. Then create the one-to-one subtype row in `community_platform_report_posts` referencing the new report ID and the target post ID.
   *
   * If the target is a comment, query `community_platform_comments` by ID, ensuring the comment exists and is in a reportable lifecycle state. Join or subsequently load its parent `community_platform_posts` row using `community_platform_post_id` to derive the containing community. Create the parent row in `community_platform_reports` using that community ID, then create the one-to-one subtype row in `community_platform_report_comments` referencing the new report ID and the target comment ID.
   *
   * Execute parent report creation and subtype binding creation in a single transaction so no orphaned report or target-binding record can persist. Return the created report DTO after insertion. The response mapper should include the report's primary fields and target representation derived from the existing one-to-one subtype relation.
   *
   * Reject the request with an authorization error when the caller is not an authenticated member. Reject with not-found when the referenced post or comment does not exist. Reject with business-rule violation when the target content is unavailable for reporting or otherwise outside the allowed reporting workflow. Do not create `community_platform_report_reviews` records here, because moderator decisions belong to the separate review phase. Optionally guard against abusive duplicate submissions using service-layer policy if such policy is later defined, but do not invent persistence fields beyond the loaded schema.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: ICommunityPlatformReport.ICreate,
  ): Promise<ICommunityPlatformReport> {
    try {
      return await postCommunityPlatformMemberReports({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered and paginated moderator report review list.
   *
   * This operation provides the community-scoped active moderation queue described in the report review requirements. It is intended for moderators who need to review reports awaiting action within a specific community. In accordance with the business rules, the returned list is limited to reports related to content in the requested community only, and it is designed to support the moderator workflow where post reports are reviewed in the community where the post was published and comment reports are reviewed in the community of the post that contains the comment.
   *
   * The response is expected to surface the information moderators need for triage, including the reported content, the identity of the reporting member, and the stated reason text. Reports remain separated by community so that moderation review in one community does not appear in another community's queue. Reports that are no longer part of active review, such as dismissed items, must not appear in this list, and reports tied to unavailable communities must not be treated as normal active moderation entries.
   *
   * Security for this operation is community-specific. Only a member who holds moderation authority for the target community should be able to access the report review list for that community. Members without that role must be denied access, and moderators must not use this endpoint to inspect reports belonging to a different community. This endpoint is typically used before a separate report-detail or moderation-decision operation so moderators can first discover pending items and then act on an individual report.
   *
   * From a data perspective, this endpoint centers on the primary report records and their target-specific subtype relationships for post and comment reports, while applying community resolution logic from the underlying reported content. The operation must return only pending review items that belong to an available community context and must preserve the distinction between pending reports and reports that have already reached an approved deletion outcome or a dismissed outcome.
   *
   * @param connection
   * @param body Community-scoped report review query and pagination criteria
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implement this operation as a moderator-scoped search over active report records.
   *
   * Accept a JSON request body of type ICommunityPlatformReport.IRequest containing at minimum the community selector used to scope the review queue, plus pagination and sorting inputs appropriate for list browsing. Resolve the caller's authenticated member identity, then verify that the caller is an owner or moderator of the requested community before any report data is returned. If the caller is not a moderator for that community, reject the request with an authorization error.
   *
   * Build the query from the community_platform_reports primary records and join the target subtype tables that identify whether each report references a post or a comment. For post-targeted reports, resolve the community directly from the related post. For comment-targeted reports, resolve the community through the parent post that contains the comment. Include only reports whose resolved community matches the requested community. Exclude reports that are no longer awaiting review, including dismissed reports and reports that have already reached an approved deletion outcome. Also exclude reports whose related community is unavailable, because the requirements state those must not be presented as normal active moderation items.
   *
   * Project summary data suitable for a moderation list view. Each item should include report identity, current review state, created time, reason text, reporter identity summary, and a target summary that indicates whether the report concerns a post or a comment and provides enough preview information for moderators to understand what was reported. Apply deterministic sorting, defaulting to newest pending reports first unless the request explicitly specifies another allowed sort order. Return the result in the paginated response shape IPageICommunityPlatformReport.ISummary.
   *
   * Guard against edge cases where a report's target subtype is missing, the referenced content no longer resolves cleanly, or the community lookup does not match the request scope. Such records must not leak across community boundaries. If the request omits required moderation scope information, fail validation rather than returning a cross-community list. Keep this operation read-only and do not mutate report state, review history, or reported content as part of listing.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: ICommunityPlatformReport.IRequest,
  ): Promise<IPageICommunityPlatformReport.ISummary> {
    try {
      return await patchCommunityPlatformMemberReports({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the full moderation-review details for a single report identified by its unique report ID.
   *
   * This operation supports the moderator review workflow defined for community-scoped report handling. A moderator uses the community report review list to find a pending report, then calls this endpoint to inspect the full record before making a moderation decision. The response is intended to present the same business information required by the specification: the report itself, the identity of the member who submitted it, the stated reason and optional additional detail, and the reported content itself. Because reports in this platform are governance records tied to one community, this endpoint must only expose a report when it belongs to a community the caller currently moderates.
   *
   * The underlying data comes from the canonical community_platform_reports table, which stores the reporting member reference, the community scope, the member-provided reason, optional narrative detail, the workflow status, and any recorded resolution summary. The reported target is normalized rather than embedded directly in the report row. If the report concerns a post, the operation resolves the associated community_platform_report_posts row and returns the referenced community_platform_posts record, including core post attributes such as title, post type, status, and timestamps. If the report concerns a comment, the operation resolves the community_platform_report_comments row and returns the referenced community_platform_comments record, including its body, thread relationship, status, and timestamps. Reporter identity should be presented from the member account and public profile records so moderators can see who submitted the complaint without exposing unrelated credential data.
   *
   * Security is community-local and strict. The requirements state that moderators may see only reports from communities they moderate, and members who are not moderators must be denied access. Accordingly, the service must validate the caller's signed-in member session, load the target report's community_platform_community_id, and confirm there is an active community_platform_community_moderators assignment for that same community and member before returning anything. A moderator assignment for a different community is not sufficient. If the report does not exist, if it has been removed from active business use, or if the caller does not hold matching moderator authority, the endpoint must reject the request rather than leaking whether content in another community has been reported.
   *
   * This endpoint is closely related to the moderator report review list operation. In normal usage, the list endpoint is used first so a moderator can browse reports awaiting action within a specific community, and this detail endpoint is then used to inspect one selected report in full before approval or dismissal. It also relates to later moderation decision endpoints that record a review outcome and either delete the reported content or keep it in place. Once a report has been dismissed and removed from the active review list, moderators should not assume it remains recoverable through active-review interfaces, consistent with the defined recovery expectations.
   *
   * @param connection
   * @param reportId Unique identifier of the report to retrieve
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Authenticate the caller using the active member session and resolve the current member account identity. Reject the request when there is no valid signed-in member session.
   *
   * Load the target community_platform_reports record by id where deleted_at is null. If no such report exists, return a not-found error.
   *
   * Authorize community-scoped moderator access by verifying that the caller has an active community_platform_community_moderators record for the same community_platform_community_id as the report. The authorization check must require the assignment status to represent an active moderation role and should ignore revoked or deleted assignments. If no matching active moderator assignment exists, return a forbidden error.
   *
   * Fetch the report detail graph in a single transactional read or in tightly grouped reads: the report record; the reporting member; the reporter's optional profile; the related community; the latest or relevant review history if the DTO includes it; the optional community_platform_report_posts relation with its community_platform_posts target; and the optional community_platform_report_comments relation with its community_platform_comments target. For comment targets, also load the comment's parent post so the service can preserve the post/community context of the reported comment.
   *
   * Map the result into ICommunityPlatformReport. Include the report's core governance fields from community_platform_reports such as id, reason, detail, status, resolution, created_at, and updated_at. Include reporter summary information derived from community_platform_members and community_platform_profiles, using public-facing profile fields where available and excluding credential fields like password_hash. Include exactly one resolved target representation: either the reported post from community_platform_posts or the reported comment from community_platform_comments. Never return both as active targets for one report.
   *
   * If the data is inconsistent and neither a report-post nor report-comment subtype exists for the report, return an internal consistency error because the report cannot be rendered as required. If both subtype rows exist simultaneously, also treat that as invalid report-target state and fail safely rather than returning ambiguous data.
   *
   * Do not mutate the report, review history, or target content during this operation. This endpoint is read-only. Do not expose reports from other communities, even if the caller is a moderator elsewhere. When a report has already been resolved or dismissed, the endpoint may still return it only if product policy allows direct retrieval by id for authorized moderators; however, it must never bypass the rule that dismissed reports are removed from the active list. If implementation chooses to limit this endpoint to active review records only, enforce that by checking report status before mapping the response.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":reportId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("reportId")
    reportId: string & tags.Format<"uuid">,
  ): Promise<ICommunityPlatformReport> {
    try {
      return await getCommunityPlatformMemberReportsReportId({
        member,
        reportId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
