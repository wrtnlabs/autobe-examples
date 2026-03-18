import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPlatformReport } from "../../../../../api/structures/ICommunityPlatformReport";
import { ICommunityPlatformReportResolution } from "../../../../../api/structures/ICommunityPlatformReportResolution";
import { AdminAuth } from "../../../../../decorators/AdminAuth";
import { AdminPayload } from "../../../../../decorators/payload/AdminPayload";
import { getCommunityPlatformAdminReportsReportIdResolution } from "../../../../../providers/getCommunityPlatformAdminReportsReportIdResolution";
import { putCommunityPlatformAdminReportsReportIdResolution } from "../../../../../providers/putCommunityPlatformAdminReportsReportIdResolution";

@Controller("/communityPlatform/admin/reports/:reportId/resolution")
export class CommunityplatformAdminReportsResolutionController {
  /**
   * Retrieve the moderation resolution details for a specific user-submitted community report.
   *
   * This endpoint is for moderators (and authorized admin contexts if applicable) to view the decision that was applied to a particular report. In the data model, each report can have at most one resolution record (stored in `community_platform_report_resolutions` and uniquely linked by `community_platform_report_id`). The resolution captures the moderator who decided (`moderated_by_user_id`), the decision text (`resolution_decision`, e.g. approve vs dismiss), the optional moderator rationale (`moderation_note`), and the effective timestamp (`resolved_at`).
   *
   * The target report is identified by `{reportId}`, which maps to `community_platform_reports.id`. The reported content itself (post vs comment) and the reason provided by the reporter live in `community_platform_reports` and its target context tables; this operation focuses on the resolution outcome rather than the reporter reason.
   *
   * Security and authorization behavior must follow the platform rule that report retrieval is scoped to the moderator’s community. If the caller is a moderator, the system must only allow access when the moderator belongs to the same community that is associated with the report (`community_platform_reports.community_id`). If a moderator attempts to view reports for a different community, the system must deny access and must not reveal the existence of specific reports, reported content, or reporter identities beyond refusal to access. Non-moderators must be denied access similarly.
   *
   * If the report has not yet been resolved, the system must not fail the lookup. In the database model, `community_platform_reports.resolution` is optional, so the API should return a resolution view indicating that no decision has been applied yet.
   *
   * Related operations that are commonly used together include the moderator report list views (to find report IDs) and moderation actions that apply a decision (which create the `community_platform_report_resolutions` row). After moderation actions, this operation should reflect the updated resolution state.
   *
   * Expected errors include authorization denial (no details disclosure) and a not-found result for an invalid `{reportId}` that is consistent with the chosen visibility policy.
   *
   * @param connection
   * @param reportId Target report identifier whose resolution decision should be retrieved.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification Implementation steps:
   *
   * 1) Parse `reportId` (UUID) from path.
   *
   * 2) Authorization / scope check:
   *    - Identify caller actor from session context.
   *    - If caller is a moderator, determine their `community_id` by checking `community_platform_community_moderators` where `moderator_user_id` equals caller member id and `deleted_at` is null (active assignment).
   *    - Load the report’s `community_id` from `community_platform_reports` for the given `id`.
   *    - If caller is not authorized for that community, return an authorization-denied response that does not disclose whether the report exists.
   *
   * 3) Resolution lookup:
   *    - Query `community_platform_report_resolutions` by `community_platform_report_id = reportId`.
   *    - Because of the unique constraint on `community_platform_report_id`, at most one row is returned.
   *
   * 4) Response mapping:
   *    - If a resolution row exists, map to the resolution DTO including:
   *      * `id`
   *      * `communityPlatformReportId` (reportId)
   *      * `moderatedByUserId`
   *      * `resolutionDecision` (resolution_decision)
   *      * `moderationNote`
   *      * `resolvedAt`
   *      * auditing timestamps if present in the DTO.
   *    - If no resolution row exists, return a resolution view with `resolution` set to null (or return a dedicated unresolved DTO, depending on the generated schema contract).
   *
   * 5) Edge cases:
   *    - Deleted/hidden records: respect `deleted_at` fields on resolution rows when mapping; if `community_platform_report_resolutions.deleted_at` is set, treat as not available for moderators.
   *    - Performance: join only what is needed; first fetch the report’s community_id for authorization, then fetch resolution.
   *
   * 6) Error handling:
   *    - Invalid UUID format for `reportId` -> 400.
   *    - Authorized but no such report -> either 404 or authorization-style denial depending on existing global error policy; must not leak existence if authorization would be denied.
   *
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get()
  public async atReportResolution(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("reportId")
    reportId: string & tags.Format<"uuid">,
  ): Promise<ICommunityPlatformReportResolution> {
    try {
      return await getCommunityPlatformAdminReportsReportIdResolution({
        admin,
        reportId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Resolve a moderator’s decision for a single community-scoped moderation report.
   *
   * This endpoint records the moderation outcome for the report identified by `reportId` and ensures that the moderation side effects match the chosen outcome (approved outcomes remove the targeted post or comment from ordinary visibility; dismissed outcomes keep the content and remove the dismissed report from the moderator’s active list).
   *
   * Access is restricted to moderators who have authorization for the community associated with the report. If the caller is not authorized for that community, the request must be rejected without exposing whether the report exists.
   *
   * Business behavior aligns with the report lifecycle: the platform shows reports per community, includes the reported content, the reporting user, and the reason for each report, and then updates what moderators see after a decision is applied. If a report is no longer available for review, the system rejects the decision request.
   *
   * @param connection
   * @param reportId Identifier of the moderation report to resolve.
   * @param body Moderator decision payload for resolving the report, including whether the report is approved or dismissed and an optional moderation note.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification Perform report resolution as a moderator workflow.
   *
   * 1) Authorization & scope
   * - Authenticate the caller as a platform member with moderation authority.
   * - Load `community_platform_reports` by `id = reportId` selecting at minimum: id, community_id, reporter_id (only for internal use), target_type, target_id, deleted_at.
   * - Enforce that the caller is a moderator for `community_id` (or community owner if that governance is implemented) based on the platform’s community moderation mappings.
   * - If authorization fails, deny without revealing whether the report exists.
   *
   * 2) Resolve and prepare target context
   * - Load `community_platform_report_targets` for the report to obtain deterministic target context: `target_type` and `target_id`.
   * - Verify the target can be mapped to a concrete content record type within the community for moderation side effects.
   *
   * 3) Idempotent resolution upsert
   * - Upsert into `community_platform_report_resolutions` using unique key `community_platform_report_id`.
   *   - If a row exists: update `resolution_decision`, `moderation_note`, and `resolved_at`.
   *   - If absent: create row with `community_platform_report_id = reportId`, `moderated_by_user_id = authenticatedMemberId`, `resolution_decision`, `moderation_note`, `resolved_at = now()`.
   * - Because `community_platform_report_resolutions` enforces one resolution per report, use a transaction to ensure consistency.
   *
   * 4) Create/update audit snapshot
   * - Insert into `community_platform_report_snapshots` capturing moderation-relevant fields at decision time:
   *   - `community_platform_report_id` = reportId
   *   - `community_platform_report_target_id` = target context id from step 2
   *   - `snapshot_reason` = reason from `community_platform_reports.reason` (captured at decision time)
   *   - `snapshot_status` = resolution_decision value (pending/approved/dismissed as applicable; store the resolved state)
   *   - `community_platform_report_resolution_id` = resolution record id from step 3
   *   - `reviewed_by_member_id` or `reviewed_by_admin_id` populated based on caller type; leave the other null.
   *   - Set `captured_at = now()`.
   *
   * 5) Apply moderation side effects
   * - If resolution_decision == "approved": delete the targeted content item (post or comment) using the platform’s existing deletion policy for those entities.
   *   - Ensure the deletion outcome matches ordinary viewing behavior expectations (approved reports delete targeted content).
   * - If resolution_decision == "dismissed": do not delete the targeted content.
   *   - Ensure dismissed reports are no longer returned by moderator active report list queries.
   *
   * 6) Response payload
   * - Return the updated report view including the applied resolution decision and moderation note, consistent with existing response DTO conventions.
   *
   * Edge cases
   * - If target mapping is inconsistent or the content cannot be resolved for the report’s community, abort with a validation error.
   * - If the report has been marked deleted in `community_platform_reports.deleted_at`, deny or return not-found depending on platform error mapping (must not leak existence on auth failures).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put()
  public async updateResolution(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("reportId")
    reportId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformReportResolution.ICreate,
  ): Promise<ICommunityPlatformReport> {
    try {
      return await putCommunityPlatformAdminReportsReportIdResolution({
        admin,
        reportId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
