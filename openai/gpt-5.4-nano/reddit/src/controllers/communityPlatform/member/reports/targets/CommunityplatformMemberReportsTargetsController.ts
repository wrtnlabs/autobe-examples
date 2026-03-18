import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPlatformReportTarget } from "../../../../../api/structures/ICommunityPlatformReportTarget";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { deleteCommunityPlatformMemberReportsReportIdTargetsTargetId } from "../../../../../providers/deleteCommunityPlatformMemberReportsReportIdTargetsTargetId";
import { getCommunityPlatformMemberReportsReportIdTargetsTargetId } from "../../../../../providers/getCommunityPlatformMemberReportsReportIdTargetsTargetId";
import { patchCommunityPlatformMemberReportsReportIdTargets } from "../../../../../providers/patchCommunityPlatformMemberReportsReportIdTargets";
import { postCommunityPlatformMemberReportsReportIdTargets } from "../../../../../providers/postCommunityPlatformMemberReportsReportIdTargets";
import { putCommunityPlatformMemberReportsReportIdTargetsTargetId } from "../../../../../providers/putCommunityPlatformMemberReportsReportIdTargetsTargetId";

@Controller("/communityPlatform/member/reports/:reportId/targets")
export class CommunityplatformMemberReportsTargetsController {
  /**
   * Creates a concrete target-context record for a specific moderation report.
   *
   * In this platform, a moderation report is stored with a target discriminator (target_type) and a target identifier (target_id) alongside reporter identity, community scope, and the reporter-provided reason. Moderation UI needs an explicit target-context row so that the system can deterministically render the reported content context (post or comment) when moderators view reports for their community.
   *
   * This operation creates the mapping row in {@link community_platform_report_targets}, linking {@link community_platform_report_targets.community_platform_report_id} to the given {@link community_platform_reports.id} (the {@code reportId} path parameter) and persisting the concrete target context values.
   *
   * Security: only actors who are allowed to perform moderation within the community scope for that report may create the target mapping. Calls from unauthorized actors must be rejected.
   *
   * Validation and error behavior:
   *
   * - If the report referenced by {@code reportId} does not exist, the request is rejected.
   * - The operation must reject target inputs that cannot be resolved to real content within the same community context as the referenced report.
   * - If the same report-target context is submitted again, the operation must avoid duplicate redundant records by returning the existing mapping for the same report and target pair.
   *
   * Related behavior: when moderators later view reports for a community, the system presents the reported content and the reason based on the stored report data and this concrete target mapping.
   *
   * @param connection
   * @param reportId Target report identifier. The report must exist (and be active per platform listing rules) and define the community scope for the target resolution.
   * @param body Target-context creation payload for a moderation report.
   *
   *             Specifies the concrete reported content referenced by this report using a discriminator (target_type) plus the concrete content identifier (target_id). The system validates that the referenced content exists and belongs to the same community as the report.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implementation steps:
   *
   * 1) Authorization
   * - Resolve the community moderation scope for the provided reportId by loading community_platform_reports (including community_id).
   * - Verify the caller is permitted to create/maintain moderation-related mappings for that community.
   * - If not permitted, reject.
   *
   * 2) Load report
   * - SELECT from community_platform_reports WHERE id = reportId AND (deleted_at IS NULL per normal active-record rules used by list/view endpoints).
   * - If not found, reject.
   *
   * 3) Parse request payload
   * - Read requested target_type and target_id from request body DTO.
   *
   * 4) Validate target existence within the report’s community
   * - If target_type indicates a post: verify community_platform_posts exists with id = target_id AND community_id = report.community_id.
   * - If target_type indicates a comment: verify community_platform_comments exists with id = target_id and its parent post belongs to report.community_id.
   * - If validation fails, reject.
   *
   * 5) Deduplication / idempotency
   * - Check community_platform_report_targets for an existing row with community_platform_report_id = reportId AND target_type = requested target_type AND target_id = requested target_id (and deleted_at IS NULL if the application treats deleted rows as inactive).
   * - If exists, return that row.
   * - Otherwise, INSERT a new community_platform_report_targets row.
   *
   * 6) Return
   * - Return the created (or existing) community_platform_report_targets record as the response DTO.
   *
   * 7) Edge cases
   * - If the report was already reviewed/resolved and the system disallows target-context changes (if such rule exists in business logic), reject accordingly.
   * - Ensure all DB operations are executed in a single transaction to prevent race-condition duplicates.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async createReportTarget(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("reportId")
    reportId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformReportTarget.ICreate,
  ): Promise<void> {
    try {
      return await postCommunityPlatformMemberReportsReportIdTargets({
        member,
        reportId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update the concrete target context associated with an existing moderation report.
   *
   * This operation is designed around the data model where a report stores only the reporter/member, the community context, a required reason, and a polymorphic target reference. In the database, that concrete target reference is represented by `community_platform_report_targets`, which includes `target_type` (discriminator for the kind of reported content) and `target_id` (the identifier of the concrete content instance). The report itself is `community_platform_reports`, which also carries `community_id` and soft-deletion via `deleted_at`.
   *
   * This operation exists to modify which specific content instance (either a post or a comment) the report is bound to for moderation presentation and moderation outcomes. Per the domain rules, each report targets exactly one piece of content within exactly one community, and that mapping must remain consistent with the report’s `community_id` so that moderation scope is preserved.
   *
   * Security and access control: report target context is moderation-relevant. Only elevated actors (community moderators within the report’s community, or platform admins) should be allowed to change report target bindings. If access is denied, the system must not reveal the existence of report details beyond refusing access.
   *
   * Validation rules and consistency checks:
   *
   * - The `{reportId}` must reference an existing `community_platform_reports` row that is not marked as deleted via `deleted_at`.
   * - The new `target_type` and `target_id` must identify a content instance that belongs to the same `community_id` as the report. This prevents cross-community target binding.
   * - If the report has existing `community_platform_report_snapshots`, the system must preserve historical determinism. Therefore, target-context updates should create a new snapshot record (or otherwise capture the updated target reference) instead of mutating prior snapshots’ captured fields.
   *
   * Expected behavior:
   *
   * - On success, the operation returns the updated report target context (the concrete `target_type`/`target_id` association) so the client can render the moderation UI consistently.
   * - On invalid input (target not found, cross-community mismatch, or unsupported target_type), the operation returns an appropriate error.
   *
   * Related operations:
   *
   * - Moderators view reports for their community by listing reports associated with their community (which depends on the report’s target mapping).
   * - Moderator approval/dismissal affects content visibility based on the moderation decision captured for the targeted post/comment; because snapshots preserve point-in-time state, this operation must not break that workflow by rewriting already-captured snapshot fields.
   *
   *
   * @param connection
   * @param reportId Target report identifier whose moderation target context is being updated.
   * @param body Updated target binding for the report: the discriminator identifying whether the report targets a post or a comment, and the concrete target content identifier within the same community as the report.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Realize Agent implementation guide for PATCH /reports/{reportId}/targets.
   *
   * 1) AuthZ:
   * - Identify current actor and determine authorization to update moderation-relevant report target mappings.
   * - Allow only: (a) community moderators of the community associated with the report, or (b) platform admins.
   * - If unauthorized, return access denied without disclosing whether report exists.
   *
   * 2) Load report and verify state:
   * - Query community_platform_reports by id = {reportId}.
   * - If not found or deleted_at is not null, return not found or invalid state (choose consistent error mapping).
   *
   * 3) Validate new target binding:
   * - Parse request body containing targetType and targetId (and any other fields included by the DTO).
   * - Validate targetType discriminator (must match the report-target discriminator values used by the system: expected to be either post or comment).
   * - Verify the content identified by targetId exists and belongs to the same community as the report.
   *   - For post targets: ensure community_platform_posts.id = targetId and community_platform_posts.community_id = report.community_id.
   *   - For comment targets: ensure community_platform_comments.id = targetId and the comment’s parent post (community_platform_comments.community_platform_post_id) belongs to report.community_id.
   * - If mismatch, return validation error.
   *
   * 4) Update report target context deterministically:
   * - Locate the existing target context row(s) in community_platform_report_targets for community_platform_report_id = reportId that are not deleted (deleted_at is null).
   * - Update the target_type and target_id to the new validated values.
   * - If the system requires single active target context, ensure exactly one active row exists; otherwise, update the active one and optionally soft-delete/replace per schema design.
   *
   * 5) Snapshot handling to preserve history:
   * - Check for existing community_platform_report_snapshots rows for the reportId.
   * - If snapshots exist, do not rewrite fields already captured.
   * - Create a new snapshot row that captures:
   *   - report id linkage (community_platform_report_id)
   *   - reportTarget linkage (community_platform_report_target_id)
   *   - snapshot_reason from the current report.reason (or from the snapshot if required by business rules)
   *   - snapshot_status derived from the latest snapshot_status (or from pending/default if none)
   *   - captured_at = now
   *   - leave snapshot_decisioned_at null if status is unresolved.
   * - If no snapshots exist, the update may proceed without creating a snapshot depending on system workflow; however, safer is to create an initial snapshot consistent with moderation timeline.
   *
   * 6) Return result:
   * - Return an updated target context summary DTO including targetType and targetId and the reportId for client confirmation.
   *
   * Edge cases:
   * - Concurrency: run update and snapshot creation in a transaction.
   * - If target context row does not exist yet, create it.
   * - Ensure soft-deleted target context is not re-used; prefer creating a new active target context row.
   *
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async updateReportTargets(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("reportId")
    reportId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformReportTarget.IUpdate,
  ): Promise<void> {
    try {
      return await patchCommunityPlatformMemberReportsReportIdTargets({
        member,
        reportId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the moderation target context associated with a specific report.
   *
   * This endpoint loads exactly one record from the report-target mapping table (community_platform_report_targets) using the provided path identifiers. A report targets exactly one concrete piece of content (either a post or a comment), and the pair of (target_type, target_id) is captured in this target-context record for deterministic moderator rendering. The endpoint returns the stored target context fields so moderators can display what content the report refers to.
   *
   * Authorization is scoped to community moderation. The system must first resolve the community associated with the given report (community_platform_reports.community_id). Access is allowed only when the caller is a moderator of that same community (or the community owner, depending on the moderator visibility rules). If a moderator attempts to access reports outside their moderation scope, the system must deny access without exposing whether specific report/target records exist.
   *
   * The operation enforces referential consistency: the target context (community_platform_report_targets.id) must belong to the specified report (community_platform_report_targets.community_platform_report_id). The endpoint returns an error if the identifiers are inconsistent.
   *
   * Expected behavior:
   * - On success, returns the single report target context record identified by (reportId, targetId).
   * - On authorization failure, the system refuses the request without revealing existence or details of the requested report/target.
   * - If the identifiers do not match a valid target context for the report, the system responds with a not-found style outcome.
   *
   * Related operations:
   * - A moderator list view for community reports provides the report entries; this endpoint is the detail view to fetch the reported content context for a specific report-target mapping record.
   *
   * @param connection
   * @param reportId Identifier of the moderation report whose target context should be retrieved.
   * @param targetId Identifier of the concrete report target context record to retrieve; must belong to the specified report.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1) Parse path params: reportId, targetId.
   *
   * 2) Authorization scoping:
   * - Query community_platform_reports by id = reportId.
   * - If not found: return not-found (do not disclose authorization details).
   * - Determine communityId from community_platform_reports.community_id.
   * - Verify caller is allowed to view moderation details for this community (moderator membership or community-owner authority per requirements). If not allowed: deny access with a generic refusal response (no existence leakage).
   *
   * 3) Fetch target context:
   * - Query community_platform_report_targets where id = targetId AND community_platform_report_id = reportId.
   * - If not found, return not-found (after authorization check).
   *
   * 4) Return response DTO representing the community_platform_report_targets record.
   *
   * 5) Edge cases:
   * - Identifiers inconsistent (targetId exists but belongs to a different report): treat as not-found.
   * - Caller lacks permission for the report's community: deny access before fetching target content details as needed to avoid information leakage.
   *
   * No transaction is required because this is a read-only operation.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":targetId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("reportId")
    reportId: string & tags.Format<"uuid">,
    @TypedParam("targetId")
    targetId: string & tags.Format<"uuid">,
  ): Promise<ICommunityPlatformReportTarget> {
    try {
      return await getCommunityPlatformMemberReportsReportIdTargetsTargetId({
        member,
        reportId,
        targetId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update the moderation target context (the concrete target content identity) for a single moderation report.
   *
   * This operation targets one existing record in `community_platform_report_targets`, which stores the pair of `target_type` and `target_id` representing what moderators see as the subject of the report, linked back to its owning report via `community_platform_report_id`. The update is performed for the specific target context identified by the path parameters so that moderators can render the report’s target content deterministically while preserving the report’s association with its community.
   *
   * The update must respect the community moderation scope rules. Reports are visible to moderators only within the community associated with the report. Therefore, the server must resolve the report via `community_platform_reports.id` (using `reportId`) to determine its `community_id`, then verify that the caller is either a community moderator for that `community_id` (or the community owner, if owner authority is treated as highest in the moderation scope) before returning or applying changes. If the caller does not belong to that community as a moderator, the operation must deny access without revealing whether the report or target record exists.
   *
   * Business constraints: the underlying `community_platform_report_targets` model includes `target_type` (a string discriminator) and `target_id` (UUID) and also supports a nullable `deleted_at`. The implementation should update the target context fields only on the matched record and should not resurrect or otherwise change deletion behavior unless explicitly supported by the request DTO. When `deleted_at` is present on the record, the implementation should treat the record as not editable and respond with an appropriate error.
   *
   * This endpoint is intentionally scoped to target-context updates and does not implement moderation decisions. Moderation decisions that approve/dismiss reports and their side effects (deleting or keeping the targeted post/comment) are applied by the report resolution workflow in `community_platform_report_resolutions` and should not be triggered by this endpoint.
   *
   * Related operations:
   * - The moderator can view reports for their community, including the reported target details, via report list endpoints (not defined here).
   * - Approving/dismissing a report should be done through the dedicated report resolution endpoint(s) that persist `community_platform_report_resolutions.resolution_decision` and `resolved_at`.
   *
   * @param connection
   * @param reportId Target report identifier whose community moderation scope is used for authorization.
   * @param targetId Identifier of the report target context record to update.
   * @param body Updated target context for the report. This changes what concrete content (post/comment) the report targets within its community.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implementation steps:
   * 1) Start a transaction.
   * 2) Load `community_platform_reports` by `id = reportId`.
   *    - If not found, return 404.
   * 3) Determine `community_id` from the report row.
   * 4) Authorization check:
   *    - Verify caller is allowed to manage report targets for that `community_id` based on moderation scope rules.
   *    - If not authorized, return 403 without disclosing existence.
   * 5) Load `community_platform_report_targets` by `id = targetId`.
   *    - Ensure its `community_platform_report_id` equals the loaded report’s id; if not, return 404.
   *    - If `deleted_at` is not null, treat as not editable; return 404 or 409 depending on standard for deleted/hidden records.
   * 6) Validate request body fields:
   *    - `target_type`: non-empty string.
   *    - `target_id`: must be a valid UUID string (schema layer should enforce format).
   * 7) Update the record fields (`target_type`, `target_id`) and persist `updated_at`.
   *    - Do not touch `created_at`.
   * 8) Commit transaction.
   * 9) Return the updated `community_platform_report_targets` data as the response DTO.
   *
   * Edge cases:
   * - Mismatched (reportId, targetId) pair must not be accepted.
   * - Do not perform any moderation side effects here.
   *
   * Database queries:
   * - 1 query for report by id.
   * - 1 query for target by id (and verify report linkage).
   * - 1 update statement on target row.
   *
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":targetId")
  public async updateTargetContext(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("reportId")
    reportId: string & tags.Format<"uuid">,
    @TypedParam("targetId")
    targetId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformReportTarget.IUpdate,
  ): Promise<ICommunityPlatformReportTarget> {
    try {
      return await putCommunityPlatformMemberReportsReportIdTargetsTargetId({
        member,
        reportId,
        targetId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently removes the specified report-target context record.
   *
   * This endpoint deletes one concrete association between a moderation report and a specific target content instance by removing the corresponding row in `community_platform_report_targets`, which stores:
   * - the polymorphic discriminator `target_type`
   * - the concrete `target_id`
   * - the parent `community_platform_report_id`
   * - timestamps for creation/update and an optional `deleted_at` column.
   *
   * Because `community_platform_report_targets` is the target-context container used by the reporting workflow, removing a target-context row will affect what moderators can render when reviewing that report. The operation should therefore be restricted to privileged moderation actors.
   *
   * Authorization behavior:
   * - Admin actors and community moderators (as permitted by the moderation domain rules) are allowed to remove report-target contexts.
   * - Other actors (including the reporter/member) must be denied to prevent tampering with moderation inputs.
   *
   * Validation and integrity rules:
   * - The `reportId` path parameter must match the parent `community_platform_report_targets.community_platform_report_id`.
   * - The `targetId` must match `community_platform_report_targets.id`.
   * - If no matching record exists for the provided pair, the operation must reject with a not-found style error.
   *
   * If the target-context row has related snapshots (`community_platform_report_snapshots` references `community_platform_report_target_id`), the implementation must rely on the database referential behavior defined for relations (and/or explicit handling) so that snapshot history rendering remains consistent.
   *
   * This operation pairs naturally with moderator report list/review APIs (e.g., moderator views of reports and moderation outcomes). Clients should typically remove or adjust targets only as part of a broader moderation correction flow rather than as a general user action.
   *
   * @param connection
   * @param reportId The identifier of the moderation report whose target-context row will be removed.
   * @param targetId The identifier of the specific report-target context record to remove.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Service-layer steps:
   * 1) Parse `reportId` and `targetId` from path.
   * 2) Authorization: verify caller is an admin or a moderator who is allowed to manage moderation report data within the scope of the referenced report.
   *    - Determine the report’s `community_id` via `community_platform_reports` and then enforce moderator membership for that community (or admin override).
   * 3) Locate the target-context row:
   *    - Query `community_platform_report_targets` with `id = targetId` AND `community_platform_report_id = reportId`.
   * 4) If not found, throw a not-found error.
   * 5) Delete behavior:
   *    - Execute deletion of the `community_platform_report_targets` row by primary key.
   *    - If soft-deletion semantics are implemented via `deleted_at`, use the column accordingly; otherwise perform a hard delete.
   *    - Ensure the operation respects referential integrity with `community_platform_report_snapshots` (snapshots reference `community_platform_report_target_id`).
   *      - If snapshots are configured with cascade in the ORM, deletion will cascade; if not, explicitly handle the constraint violation by either rejecting or removing/archiving dependent snapshots per internal consistency rules.
   * 6) Return deleted target summary DTO.
   *
   * Database queries/transactions:
   * - Use a transaction that covers:
   *   a) authorization scoping read (report + community)
   *   b) target row existence check
   *   c) deletion
   *   d) return DTO construction from the deleted record (prefer retrieving the row before deletion, then deleting).
   *
   * Edge cases:
   * - If the report exists but belongs to a different community than the moderator’s scope, reject authorization.
   * - If multiple target rows could exist for the same report, the composite lookup by targetId prevents deleting unintended rows.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":targetId")
  public async eraseReportTarget(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("reportId")
    reportId: string & tags.Format<"uuid">,
    @TypedParam("targetId")
    targetId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteCommunityPlatformMemberReportsReportIdTargetsTargetId({
        member,
        reportId,
        targetId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
