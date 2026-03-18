import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPlatformReportSnapshot } from "../../../../../api/structures/ICommunityPlatformReportSnapshot";
import { IPageICommunityPlatformReportSnapshot } from "../../../../../api/structures/IPageICommunityPlatformReportSnapshot";
import { AdminAuth } from "../../../../../decorators/AdminAuth";
import { AdminPayload } from "../../../../../decorators/payload/AdminPayload";
import { getCommunityPlatformAdminReportsReportIdSnapshotsSnapshotId } from "../../../../../providers/getCommunityPlatformAdminReportsReportIdSnapshotsSnapshotId";
import { patchCommunityPlatformAdminReportsReportIdSnapshots } from "../../../../../providers/patchCommunityPlatformAdminReportsReportIdSnapshots";
import { postCommunityPlatformAdminReportsReportIdSnapshots } from "../../../../../providers/postCommunityPlatformAdminReportsReportIdSnapshots";

@Controller("/communityPlatform/admin/reports/:reportId/snapshots")
export class CommunityplatformAdminReportsSnapshotsController {
  /**
   * Create an auditable snapshot entry for a specific report.
   *
   * This operation records the moderation-relevant state of a user-submitted report at a specific point in time, matching the data model of `community_platform_report_snapshots`. The snapshot captures the `snapshot_reason` (stored verbatim from the reporter at snapshot time) and `snapshot_status` (the moderation state at that moment), and it may additionally associate review attribution fields (reviewed_by_admin_id or reviewed_by_member_id) and a linked resolution record when a decision has been applied.
   *
   * Because the snapshot is tied to the original report (`community_platform_report_snapshots.community_platform_report_id` references `community_platform_reports.id`), this operation uses the path parameter `reportId` to scope creation.
   *
   * Authorization: only authenticated moderation actors who are allowed to review reports for the report’s associated community may create snapshots. If a non-moderator attempts this for a community they do not moderate, access must be denied without exposing report details beyond refusal.
   *
   * Validation and business rules: the request must provide the snapshot fields required to create a coherent snapshot row (`snapshot_reason`, `snapshot_status`). If the snapshot includes decision linkage (resolution id / decisioned timestamp), the server must ensure consistency with the report’s moderation lifecycle so that historical rendering remains deterministic. The server records `captured_at` as the actual time of snapshot creation.
   *
   * Related operations: moderators obtain reports via the moderator view endpoints (list reports for their community) and then apply decisions (approve/dismiss). This snapshot creation operation is the persistence step used to ensure the moderation timeline matches the selected decision outcome (deleted content after approval; kept content after dismissal).
   *
   * @param connection
   * @param reportId Target report identifier. The snapshot will be created for this report’s moderation timeline.
   * @param body Snapshot creation payload containing moderation state and reason to capture at this moment.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification Implementation steps:
   * 1) Authenticate caller and determine whether the caller is a community moderator (member) or admin.
   * 2) Load community_platform_reports by id=reportId, including its community_id and ensure it is accessible within the caller’s moderation scope (moderators only for communities they moderate; community owner is allowed; otherwise deny without leaking existence).
   * 3) Validate request payload:
   *    - snapshot_reason must be non-empty.
   *    - snapshot_status must be a supported moderation state string.
   *    - If resolution linkage fields are provided, verify a corresponding community_platform_report_resolutions record exists and is associated with this report.
   * 4) Within a transaction:
   *    - Insert into community_platform_report_snapshots:
   *      - community_platform_report_id = reportId
   *      - reviewed_by_admin_id or reviewed_by_member_id depending on caller type
   *      - community_platform_report_target_id = derived from report's target context (from community_platform_report_targets where community_platform_report_id=reportId and not deleted)
   *      - community_platform_report_resolution_id = (if provided / if decision applied)
   *      - snapshot_reason, snapshot_status
   *      - snapshot_decisioned_at (if provided, else null)
   *      - captured_at = now
   *      - created_at/updated_at = now
   *      - deleted_at = null
   *    - Return the created snapshot row (joined to resolution/target as needed for response DTO).
   * 5) Ensure idempotency/duplicate handling: if the platform rules require only one snapshot per decision change, check latest snapshot_status for this report and prevent redundant snapshots (follow exact moderation rules as implemented in service layer).
   * 6) Handle errors:
   *    - 404 if reportId not found (or 403/404 combined per security policy; do not leak existence to unauthorized callers)
   *    - 400 for invalid snapshot fields
   *    - 500 for unexpected DB errors.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async createSnapshot(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("reportId")
    reportId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformReportSnapshot.ICreate,
  ): Promise<ICommunityPlatformReportSnapshot> {
    try {
      return await postCommunityPlatformAdminReportsReportIdSnapshots({
        admin,
        reportId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the snapshot timeline for a specific moderation report.
   *
   * This endpoint returns the ordered history of moderation-relevant snapshot records for the report identified by `reportId`. The underlying database structure is `community_platform_report_snapshots`, which stores point-in-time values such as the snapshot reason, snapshot status, captured timestamp, and optional decision attribution (including the decision timing stored as `snapshot_decisioned_at` and the resolution linkage captured by `community_platform_report_resolution_id` via the snapshot row).
   *
   * Access to this data is restricted by community scope. The system must verify that the requester is authorized to view reports and moderation snapshots for the community associated with the report (the report's `community_id` comes from `community_platform_reports`). If the requester is not authorized for that community, the system must deny access without revealing report snapshot existence or details.
   *
   * The returned snapshot list is intended for moderation UIs. Each snapshot item must render the reporter-provided reason (stored as `snapshot_reason`), the snapshot status (stored as `snapshot_status`), and the capture/decision timestamps (`captured_at` and `snapshot_decisioned_at`). Where target context is required for UI rendering, the implementation can join `community_platform_report_targets` using `community_platform_report_target_id` (from `community_platform_report_snapshots`) to obtain `target_type` and `target_id`.
   *
   * If no snapshots match the requested filters, the endpoint returns an empty paginated result. The operation is read-only and does not modify any data.
   *
   * @param connection
   * @param reportId Target report identifier whose snapshot timeline should be retrieved.
   * @param body Snapshot timeline query parameters including pagination, sorting direction, and optional filters such as snapshot status or decision presence.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification Implementation steps:
   *
   * 1) Authorization & scoping
   * - Authenticate actor (guest/member/admin).
   * - If actor is guest, deny.
   * - Load the report row by `community_platform_reports.id = reportId` and read its `community_id`.
   * - Check whether the authenticated requester is a moderator for that same `community_id` (or has equivalent community moderation permission per platform rules). If not, deny without revealing details.
   *
   * 2) Querying snapshots
   * - Read pagination/sorting/filter criteria from the PATCH request body (ICommunityPlatformReportSnapshot.IRequest).
   * - Query `community_platform_report_snapshots` where `community_platform_report_id = reportId`.
   * - Apply optional filters (e.g., by snapshot_status and/or presence/absence of decision timestamp) based strictly on request body fields.
   * - Order by `captured_at` per requested sort direction.
   * - Apply pagination limits.
   *
   * 3) Optional target-context enrichment
   * - If the response DTO requires target context, join `community_platform_report_targets` on `community_platform_report_target_id` to fetch `target_type` and `target_id` for each snapshot item.
   * - If decision metadata is required, the snapshot already includes `community_platform_report_resolution_id` and `snapshot_decisioned_at`; optionally join `community_platform_report_resolutions` only if request/response DTO requires resolution_decision and moderation_note.
   *
   * 4) Response mapping
   * - Map each snapshot row to the snapshot summary DTO fields: snapshot reason, snapshot status, captured_at, snapshot_decisioned_at, reviewer attribution (reviewed_by_admin_id/reviewed_by_member_id), and target context (target_type/target_id) when included.
   *
   * 5) Error handling
   * - If reportId is not accessible due to authorization, deny access.
   * - If reportId does not exist, deny access (do not leak existence) per reporting security expectations.
   *
   * 6) Transaction
   * - Use a read-only transaction (no writes).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("reportId")
    reportId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformReportSnapshot.IRequest,
  ): Promise<IPageICommunityPlatformReportSnapshot.ISummary> {
    try {
      return await patchCommunityPlatformAdminReportsReportIdSnapshots({
        admin,
        reportId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single moderation report snapshot for a specific report.
   *
   * This endpoint is designed for moderator or admin review flows where the system must render a deterministic historical view of a report at the moment a moderation action (or non-decision state) was captured. The snapshot row stores moderation-relevant fields such as `snapshot_reason`, `snapshot_status`, and decision timestamps (`snapshot_decisioned_at`) captured at `captured_at`, while preserving attribution to reviewing actors through `reviewed_by_admin_id` / `reviewed_by_member_id`. Because the snapshot is point-in-time, it can be rendered consistently even if the underlying report or moderation resolution changes later.
   *
   * Authorization and community scope are critical. Moderators can view reports only for communities they moderate, and access must not reveal whether specific reports exist when access is denied. Therefore, after loading `community_platform_report_snapshots` by `id` and its associated `community_platform_reports` row, the service layer must enforce that:
   * - A moderator can access the snapshot only if the report’s `community_id` matches the community context they moderate.
   * - A moderator from a different community is denied access without disclosing report/snapshot existence.
   * - Admin actors may access as permitted by the broader admin authorization rules.
   *
   * The response is returned as the snapshot entity’s DTO, including the snapshot’s linkages: the snapshot references the original report (`community_platform_report_id`), the captured target context (`community_platform_report_target_id`), and optionally the moderation resolution (`community_platform_report_resolution_id`). The returned data is intended for read-only rendering of the moderation timeline.
   *
   * Related operations that commonly pair with this one are the moderator list operation for active/pending reports for a community (to discover reportId values), and resolution/decision operations (not defined here) that generate new snapshots or resolutions that subsequent calls can retrieve by snapshotId.
   *
   * Expected behavior:
   * - Returns the requested snapshot when both identifiers are valid and the caller is authorized.
   * - Returns an access-denied response when the caller is not authorized to view reports for the snapshot’s underlying community.
   * - Returns a not-found response when the snapshotId does not correspond to the specified reportId.
   *
   * @param connection
   * @param reportId The UUID of the moderation report whose snapshot is being retrieved.
   * @param snapshotId The UUID of the report snapshot to retrieve. Must correspond to the snapshot captured state within the given report.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification Service implementation steps:
   * 1) Parse `reportId` and `snapshotId` from path parameters (both UUID strings).
   * 2) Query `community_platform_report_snapshots` by `id = snapshotId` AND `community_platform_report_id = reportId`.
   *    - If no row exists, return not-found.
   * 3) Join/load the associated `community_platform_reports` row using `community_platform_report_id` to obtain `community_id`.
   * 4) Authorization check:
   *    - Determine the caller actor (guest/member/admin) and moderator membership (if moderator).
   *    - If caller is a moderator, verify they moderate the `community_id` associated with the report.
   *    - If caller is not authorized, return access denied without exposing existence of the snapshot/report.
   *    - Admin actors are authorized according to admin authorization policy.
   * 5) Build response DTO for the snapshot.
   *    - Include snapshot fields: `id`, `community_platform_report_id`, `reviewed_by_admin_id`, `reviewed_by_member_id`, `community_platform_report_target_id`, `community_platform_report_resolution_id`, `snapshot_reason`, `snapshot_status`, `snapshot_decisioned_at`, `captured_at`, `created_at`, `updated_at`.
   *    - If the DTO design expects nested target/resolution details, load via relations `reportTarget` and `resolution` using their foreign keys.
   * 6) No transaction is required because this is a read-only operation.
   *
   * Edge cases:
   * - If the snapshot exists but belongs to a different reportId, treat as not-found (because both identifiers must match).
   * - If snapshot is deleted via `deleted_at`, follow the platform’s data retention policy for read behavior (the implementation should respect schema-driven visibility rules for deleted snapshot rows).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":snapshotId")
  public async at(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("reportId")
    reportId: string & tags.Format<"uuid">,
    @TypedParam("snapshotId")
    snapshotId: string & tags.Format<"uuid">,
  ): Promise<ICommunityPlatformReportSnapshot> {
    try {
      return await getCommunityPlatformAdminReportsReportIdSnapshotsSnapshotId({
        admin,
        reportId,
        snapshotId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
