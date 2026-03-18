import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { ICommunityPlatformReport } from "../../../../structures/ICommunityPlatformReport";
import { ICommunityPlatformReportResolution } from "../../../../structures/ICommunityPlatformReportResolution";
import { IPageICommunityPlatformReport } from "../../../../structures/IPageICommunityPlatformReport";

export * as targets from "./targets/index";
export * as decisions from "./decisions/index";

/**
 * Create a moderation report for a specific piece of community content.
 *
 * This operation records a member’s request to have a particular post or comment reviewed by community moderators. The report captures the submitting member identity (reporter), the community context, a target discriminator (post vs comment) with the target’s identifier, and a mandatory reason text provided by the reporter.
 *
 * Authorization is restricted to authenticated members. If the caller is a non-member (e.g., guest), access must be denied without exposing whether any reportable content exists.
 *
 * Internally, this operation persists a new row in `community_platform_reports` using the `reporter_id`, `community_id`, `target_type`, `target_id`, and `reason` fields. It also creates the associated `community_platform_report_targets` record for the same report, because the system models report targets as a target-type + target-id pair with deterministic snapshotability for moderator list rendering.
 *
 * Validation rules:
 *
 * - `reason` must be present (the database column is mandatory) and must be stored verbatim.
 * - `target_type` must match the provided target discriminator supported by the platform (stored in `community_platform_reports.target_type`).
 * - `target_id` must refer to an actual content record within the specified community: if `target_type` indicates a post, the `target_id` must match an existing `community_platform_posts.id` whose `community_id` equals the provided community; if `target_type` indicates a comment, the `target_id` must match an existing `community_platform_comments.id` whose parent post’s `community_id` equals the provided community.
 *
 * Error behavior:
 *
 * - If the specified community or target context is invalid or the target does not belong to the community, the system must reject the request with an appropriate validation error.
 * - If the system detects any unexpected constraint violation (for example, referential integrity failures), it must return an error without creating partial records.
 *
 * Related behavior guarantees:
 *
 * Moderators can later view reports scoped to their community. When a moderator dismisses a report, the corresponding post or comment must remain visible normally, and the dismissed report must disappear from the moderator’s active list. Those behaviors are implemented by the report resolution and lifecycle model (`community_platform_report_resolutions`, `community_platform_report_snapshots`), not by this creation endpoint.
 *
 * This endpoint is typically used together with moderator report listing endpoints (not part of this request) where the created report is displayed alongside the reported content, reporter identity, and the provided reason.
 *
 * @param props.connection
 * @param props.body Creation payload for a moderation report, including the community context, the reported target discriminator (post/comment), the reported target identifier, and a mandatory reason for why the content should be reviewed.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implementation steps (service layer):
 *
 * 1) Authenticate caller as member; obtain `memberId`.
 * 2) Validate request body fields are non-empty as required by DTO/schema:
 *    - `communityId` identifies `community_platform_communities.id`.
 *    - `targetType` must be compatible with the model’s `community_platform_reports.target_type` discriminator.
 *    - `targetId` must be a UUID.
 *    - `reason` must be provided.
 * 3) Verify community exists by selecting `community_platform_communities` by `id`.
 * 4) Resolve/verify target membership based on `targetType`:
 *    - If targeting a post: select `community_platform_posts` by `id` and ensure `community_platform_posts.community_id == communityId`.
 *    - If targeting a comment: select `community_platform_comments` by `id`, join to its `post` relation (or query by `community_platform_post_id` then fetch community_id via the post), and ensure the associated post’s `community_id == communityId`.
 *    - If verification fails, return a validation error.
 * 5) Execute a single database transaction:
 *    - Insert into `community_platform_reports` with `reporter_id = memberId`, `community_id = communityId`, `target_type = targetType`, `target_id = targetId`, `reason`, and `created_at/updated_at`.
 *    - Insert into `community_platform_report_targets` with `community_platform_report_id = newlyCreatedReportId`, `target_type = targetType`, `target_id = targetId` (and set created/updated timestamps). (Use columns exactly as defined: `community_platform_report_id`, `target_type`, `target_id`.)
 * 6) Return the created report record as the API response DTO.
 *
 * Edge cases:
 *
 * - Prevent partial writes: if any insert fails, roll back the transaction.
 * - Ensure the created report is not created for a target that belongs to another community.
 *
 * No resolution side effects are applied here; moderation decisions (approved/dismissed) are handled by moderator-specific operations that create `community_platform_report_resolutions` and snapshot records.
 * @path /communityPlatform/member/reports
 * @accessor api.functional.communityPlatform.member.reports.create
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function create(
  connection: IConnection,
  props: create.Props,
): Promise<create.Response> {
  return true === connection.simulate
    ? create.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...create.METADATA,
          path: create.path(),
          status: null,
        },
        props.body,
      );
}
export namespace create {
  export type Props = {
    /**
     * Creation payload for a moderation report, including the community context, the reported target discriminator (post/comment), the reported target identifier, and a mandatory reason for why the content should be reviewed.
     */
    body: ICommunityPlatformReport.ICreate;
  };
  export type Body = ICommunityPlatformReport.ICreate;
  export type Response = ICommunityPlatformReport;

  export const METADATA = {
    method: "POST",
    path: "/communityPlatform/member/reports",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/communityPlatform/member/reports";
  export const random = (): ICommunityPlatformReport =>
    typia.random<ICommunityPlatformReport>();
  export const simulate = (
    connection: IConnection,
    props: create.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: create.path(),
      contentType: "application/json",
    });
    try {
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Retrieve a filtered, paginated list of moderation reports for the community associated with the caller’s moderation context.
 *
 * This endpoint is intended for moderators to review user-submitted reports. It returns, for each report, the reported target information, the reporting user identity, and the mandatory reason text so moderators can make an informed decision.
 *
 * Access is strictly scoped: moderators may only view reports that belong to the community they moderate (or communities they own). If a caller attempts to access reports for another community, the system must deny access without revealing the existence of specific reports, the reported content, or reporter identities. This behavior ensures that report details are not disclosed through authorization failures.
 *
 * The operation is backed by the moderation report model where a report record stores the reporter member, the community, the target discriminator (post vs comment), the target identifier, and the reason text. Targets are represented using a target context mapping so the moderation UI can render details consistently for different target types.
 *
 * Filtering and pagination are handled in the request body to support moderation workflows, such as narrowing reports by time range, target type (post/comment), keyword matching on the reason text, and optionally by report lifecycle state using the presence/absence of a resolution decision.
 *
 * Related behaviors to expect:
 * - Report submission creates a report with a reason and target; list retrieval here is for moderation review.
 * - Moderator decisions are represented by a resolution record per report, with a decision value and optional moderation note, and moderation outcomes affect content visibility (approved reports result in deletion of the targeted post/comment; dismissed reports keep the targeted content).
 *
 * @param props.connection
 * @param props.body Moderation report search and pagination criteria scoped to a community the caller is allowed to moderate.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implementation steps for Realize Agent:
 *
 * 1) Parse request body (ICommunityPlatformReport.IRequest) for:
 * - communityId (or equivalent scope input)
 * - pagination (page/limit/cursor per DTO)
 * - sorting (e.g., createdAt/updatedAt per DTO)
 * - filters: targetType, reasonKeyword, date ranges, and optional resolutionDecision or “resolved/unresolved” toggle.
 *
 * 2) Authorization & scoping:
 * - Determine the caller’s role (guest/member/admin via middleware) and identify moderator membership in the specified community.
 * - Enforce: only moderators belonging to the community associated with the reports, or community owners, can access.
 * - If the caller is not authorized for that community, return an access-denied failure without indicating whether reports exist.
 *
 * 3) Query composition (database):
 * - Base on community_platform_reports filtered by community_id and deleted_at (exclude deleted reports unless DTO explicitly requests otherwise; follow the DTO semantics).
 * - Join/lookup report targets from community_platform_report_targets to render reported content target context (target_type + target_id) for each report.
 * - Join community_platform_members for reporter identity fields required by the response summary.
 * - Optionally left-join community_platform_report_resolutions to support resolution-based filtering (approved vs dismissed) and to enrich response summaries.
 * - For target rendering, do not assume a fixed schema; use target_type and target_id to fetch the relevant post/comment details needed for the report list summary. (The exact fields should match the response DTO contract.)
 *
 * 4) Search semantics:
 * - Reason keyword matching should use the report reason text (community_platform_reports.reason) and should align with the database indexing strategy (reason Gin trigram index).
 *
 * 5) Pagination:
 * - Use stable ordering so paging is consistent across requests (typically by created_at DESC plus tie-breaker by id).
 * - Apply pagination controls per DTO, returning IPageICommunityPlatformReport.ISummary.
 *
 * 6) Error handling:
 * - If pagination parameters are invalid, return validation error.
 * - If communityId is missing/invalid per DTO, return validation error.
 * - If authorization fails, return access denied without leaking report existence.
 *
 * Transactionality:
 * - This endpoint only reads data; no write transaction is required.
 * @path /communityPlatform/member/reports
 * @accessor api.functional.communityPlatform.member.reports.index
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function index(
  connection: IConnection,
  props: index.Props,
): Promise<index.Response> {
  return true === connection.simulate
    ? index.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...index.METADATA,
          path: index.path(),
          status: null,
        },
        props.body,
      );
}
export namespace index {
  export type Props = {
    /**
     * Moderation report search and pagination criteria scoped to a community the caller is allowed to moderate.
     */
    body: ICommunityPlatformReport.IRequest;
  };
  export type Body = ICommunityPlatformReport.IRequest;
  export type Response = IPageICommunityPlatformReport.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/communityPlatform/member/reports",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/communityPlatform/member/reports";
  export const random = (): IPageICommunityPlatformReport.ISummary =>
    typia.random<IPageICommunityPlatformReport.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: index.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: index.path(),
      contentType: "application/json",
    });
    try {
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Retrieve a single community-scoped moderation report for moderator review.
 *
 * This endpoint is designed for the community moderation UI to display the reported target context (either a post or a comment within the same community), the reporting user identity, the reporter-provided reason, and the moderation state when such state is available from related moderator review records.
 *
 * Access control is strict: moderators can only view reports that belong to the community they moderate, and non-moderators must be denied without leaking whether a specific report exists. If the report record is not available for the requested identifier, the system must respond in a way that avoids disclosing internal existence details.
 *
 * This operation is read-only. It relies on the moderation scope rules described for community report visibility, ensuring the requested report is tied to exactly one community and exactly one target content item (post or comment).
 *
 * @param props.connection
 * @param props.reportId Unique identifier of the moderation report to retrieve.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification 1) Parse `reportId` from path as UUID.
 * 2) Load the report row from `community_platform_reports` where `id = reportId` and enforce visibility rules:
 *    - If the caller is a moderator: verify the caller’s moderator community matches `community_platform_reports.community_id`.
 *    - If the caller is a community owner: treat as authorized for that community.
 *    - If the caller is not authorized: return an access-denied error that does not confirm existence.
 * 3) Join/attach report target context from `community_platform_report_targets` using `community_platform_report_targets.community_platform_report_id = community_platform_reports.id` (polymorphic target via `target_type` + `target_id`).
 * 4) Load the latest or most relevant snapshot record(s) for the report from `community_platform_report_snapshots`:
 *    - Prefer the snapshot with the most recent `captured_at`.
 *    - Include `snapshot_reason`, `snapshot_status`, and decision linkage if `community_platform_report_resolution_id` is present.
 * 5) If a resolution exists via `community_platform_report_resolutions`, load it (joined by `community_platform_report_resolution_id`) to provide moderation decision details:
 *    - resolution decision (`resolution_decision`), moderator attribution (`moderated_by_user_id`), moderation note (`moderation_note`), and `resolved_at`.
 * 6) Apply deleted/obsoleted handling:
 *    - If `community_platform_reports.deleted_at` is set, treat as not found (or denied consistently) to avoid leaking.
 *    - If snapshot or target context rows are soft-deleted, either omit those parts or treat as not found per product decision; ensure no existence disclosure.
 * 7) Return a single report detail DTO matching `ICommunityPlatformReport`.
 * 8) Use a read-only transaction.
 * 9) Error mapping:
 *    - Unauthorized: return access denied without revealing whether the report exists.
 *    - Not found / deleted: return not found or access denied (consistent with the chosen strategy) without disclosing internals.
 * @path /communityPlatform/member/reports/:reportId
 * @accessor api.functional.communityPlatform.member.reports.at
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function at(
  connection: IConnection,
  props: at.Props,
): Promise<at.Response> {
  return true === connection.simulate
    ? at.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...at.METADATA,
          path: at.path(props),
          status: null,
        },
      );
}
export namespace at {
  export type Props = {
    /**
     * Unique identifier of the moderation report to retrieve.
     */
    reportId: string & tags.Format<"uuid">;
  };
  export type Response = ICommunityPlatformReport;

  export const METADATA = {
    method: "GET",
    path: "/communityPlatform/member/reports/:reportId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/member/reports/${encodeURIComponent(props.reportId ?? "null")}`;
  export const random = (): ICommunityPlatformReport =>
    typia.random<ICommunityPlatformReport>();
  export const simulate = (
    connection: IConnection,
    props: at.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: at.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("reportId")(() => typia.assert(props.reportId));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Moderate a single user-submitted community report by applying the reviewer’s decision.
 *
 * This endpoint lets an authorized moderator (or admin, if permitted by the platform) resolve exactly one report identified by `reportId`. A report is a user-provided flag with a mandatory `reason` that targets either a specific post or a specific comment inside the report’s `community_id` context. The moderation decision recorded by this operation is persisted in `community_platform_report_resolutions` (1 resolution per report), with attribution to the reviewing moderator (`moderated_by_user_id`) and an effective timestamp (`resolved_at`).
 *
 * When the reviewer decision is `approved`, the system applies moderation side effects by deleting the targeted content instance referenced by the report’s `target_type` + `target_id` (as captured by `community_platform_report_targets` / polymorphic target context). This ensures that content visibility matches the approved outcome for the community.
 *
 * When the reviewer decision is `dismissed`, the system keeps the targeted post/comment unchanged and continues to show it normally to users. In addition, dismissed reports must be removed from the moderator’s active report list, so the dismissed report no longer appears in the current set of pending/active reports for that community.
 *
 * Security and authorization: the system must only allow moderators who belong to the same community as the report (or the community owner authority, if applicable per actor rules) to resolve the report. If a non-moderator attempts this action for a community they do not moderate, access must be denied without revealing the existence of the report or any details about the reported content or reporter identity beyond the refusal.
 *
 * Error handling and validation: the operation must verify that the report exists, that it is eligible for resolution (a report is resolved at most once via `@@unique(community_platform_report_id)` in `community_platform_report_resolutions`), and that the requester has permission for the report’s `community_id`. The operation must fail safely if the report has already been resolved, or if the requester is not authorized for the community scope.
 *
 * Related operations: moderators first view report lists via the moderator-scoped report listing endpoints; the list UI should show the reported content, the reporter identity, and the reason. After resolving a report through this operation, the list must reflect the moderation outcome: approved causes targeted content removal, dismissed causes the report to disappear from the active list while keeping the content.
 *
 * @param props.connection
 * @param props.reportId The unique identifier of the report to resolve.
 * @param props.body Resolution input for the moderator decision to apply to the specified report.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implementation guidance:
 *
 * 1) Parse inputs:
 * - Read `reportId` from path.
 * - Parse request body containing the desired moderation decision (approved vs dismissed) and an optional moderation note.
 *
 * 2) Authorization and scope:
 * - Load the report row from `community_platform_reports` by `id = reportId`.
 * - Determine `community_id` from the report.
 * - Verify the authenticated requester is either:
 *   - a moderator of that `community_id` (via `community_platform_community_moderators`), or
 *   - the community owner / admin if allowed by the domain authorization rules.
 * - If not authorized, deny without leaking whether the report exists.
 *
 * 3) Idempotency / eligibility:
 * - Check `community_platform_report_resolutions` for an existing resolution row with `community_platform_report_id = reportId`.
 * - If a resolution already exists, return an error indicating the report is already resolved.
 *
 * 4) Persist moderation decision:
 * - In a single transaction, insert a new `community_platform_report_resolutions` row with:
 *   - `community_platform_report_id = reportId`
 *   - `moderated_by_user_id = requester member id`
 *   - `resolution_decision = (approved|dismissed)`
 *   - `moderation_note` from request
 *   - `resolved_at = now()`
 *   - populate `created_at` and `updated_at`.
 *
 * 5) Snapshot consistency (if used by the system):
 * - Create a `community_platform_report_snapshots` row capturing moderation-relevant fields for deterministic rendering, including:
 *   - `community_platform_report_id = reportId`
 *   - target snapshot context via the linked `community_platform_report_target_id`
 *   - `snapshot_reason` from `community_platform_reports.reason`
 *   - `snapshot_status` consistent with the moderation decision
 *   - `snapshot_decisioned_at = resolved_at`
 *   - associate reviewing member fields as appropriate.
 *
 * 6) Apply side effects based on decision:
 * - Resolve the report target context:
 *   - Load `community_platform_report_targets` for the report (it stores `target_type` and `target_id`).
 * - If `resolution_decision` is `approved`:
 *   - Delete the targeted content instance (post or comment) referenced by the report target. Ensure that ordinary viewing no longer shows that content, matching the report lifecycle requirement.
 * - If `resolution_decision` is `dismissed`:
 *   - Do not modify the targeted content.
 *   - Ensure the report no longer appears in moderator active report lists by marking/removing it from the active set. If the system uses `deleted_at` on the report record and/or snapshots, apply the platform’s intended mechanism (using available columns in the schema you have, such as `community_platform_reports.deleted_at`).
 *
 * 7) Return response:
 * - Return the created resolution information and key report identifiers needed by clients to refresh the UI.
 *
 * 8) Edge cases:
 * - If the report is missing, treat as not authorized or return a generic error.
 * - If the target content referenced by `target_id` no longer exists, handle consistently (the resolution should still be recorded, but the system must not crash).
 *
 * 9) Transaction boundaries:
 * - Use one transaction for: resolution insert + snapshot insert + any target deletion/marking for approved/dismissed, so moderation state and content visibility remain consistent.
 * @path /communityPlatform/member/reports/:reportId
 * @accessor api.functional.communityPlatform.member.reports.resolveReport
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function resolveReport(
  connection: IConnection,
  props: resolveReport.Props,
): Promise<resolveReport.Response> {
  return true === connection.simulate
    ? resolveReport.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...resolveReport.METADATA,
          path: resolveReport.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace resolveReport {
  export type Props = {
    /**
     * The unique identifier of the report to resolve.
     */
    reportId: string & tags.Format<"uuid">;

    /**
     * Resolution input for the moderator decision to apply to the specified report.
     */
    body: ICommunityPlatformReportResolution.ICreate;
  };
  export type Body = ICommunityPlatformReportResolution.ICreate;
  export type Response = ICommunityPlatformReportResolution;

  export const METADATA = {
    method: "PUT",
    path: "/communityPlatform/member/reports/:reportId",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Omit<Props, "body">) =>
    `/communityPlatform/member/reports/${encodeURIComponent(props.reportId ?? "null")}`;
  export const random = (): ICommunityPlatformReportResolution =>
    typia.random<ICommunityPlatformReportResolution>();
  export const simulate = (
    connection: IConnection,
    props: resolveReport.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: resolveReport.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("reportId")(() => typia.assert(props.reportId));
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Permanently removes a user-submitted report from the current active reporting view for the specified report record, without deleting or hiding the content that was originally reported.
 *
 * This operation is designed to match the moderation lifecycle expectation where a moderator dismisses a report: the reported post or comment must remain unchanged and continues to be displayed normally, while the dismissed report is removed from the moderator’s active report list so it no longer appears for further moderation actions.
 *
 * Internally, the operation works against `community_platform_reports`, whose schema includes a nullable `deleted_at` timestamp for report record removal in retention/privacy workflows, plus moderation audit structures: `community_platform_report_resolutions` stores the moderator decision (`resolution_decision`) and `community_platform_report_snapshots` captures point-in-time review state. The API must ensure that the dismissal outcome is reflected consistently so content visibility matches the moderation outcome.
 *
 * Authorization requirement (high level): the operation must be restricted to actors who are allowed to perform moderation decisions for the target community (moderators for that community, and admins if applicable). Unauthorized attempts should be denied.
 *
 * Validation and error handling:
 * - If `reportId` does not exist (or the report is already removed/hidden), the operation must reject with a not-found style error.
 * - If the report has already been resolved/decided in a way that makes additional dismissal inconsistent, the operation must reject to prevent double application of moderation side effects.
 *
 * Expected side effects:
 * - The targeted post/comment content referenced by the report (via `community_platform_report_targets.target_type` + `target_id`) must remain unchanged.
 * - The dismissed report must no longer appear in moderator active report lists (implemented by deleting/hiding the report row and/or ensuring it is filtered out based on resolution state).
 *
 * Related moderation operations:
 * - Moderators can approve reports through a separate approve-resolution operation; approval is expected to delete the targeted content, which must NOT happen as part of this dismissal/removal behavior.
 *
 * @param props.connection
 * @param props.reportId Identifier of the report to be dismissed/removed from the active report list.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement DELETE /reports/{reportId} as a moderation dismissal that removes the report from the active list while preserving the reported content.
 *
 * 1) Input handling
 * - Read `reportId` from path.
 * - Validate it is a UUID.
 *
 * 2) Authorization
 * - Authenticate the caller.
 * - Verify caller is a moderator for the community that owns the report (`community_platform_reports.community_id`) or an admin actor.
 *
 * 3) Load report and current moderation state
 * - Query `community_platform_reports` by `id = reportId` (and ensure it is not already removed via `deleted_at` if the application treats that as hidden).
 * - Join/load `community_platform_report_resolutions` (if resolution exists) for the report.
 *
 * 4) Consistency checks
 * - If a resolution already exists with `resolution_decision = 'approved'`, reject because this would contradict the requested removal semantics.
 * - If a resolution already exists with `resolution_decision = 'dismissed'`, either treat as idempotent success or reject as already processed—choose one consistent with system conventions; do not re-apply side effects.
 *
 * 5) Apply dismissal outcome
 * - Create or update `community_platform_report_resolutions` for the report with:
 *   - `resolution_decision = 'dismissed'`
 *   - `moderated_by_user_id = caller member id`
 *   - `moderation_note` set from system policy (empty/auto) or derived from request (no request body in this endpoint, so use a deterministic default like empty string if schema requires non-null).
 *   - `resolved_at = now()`
 * - Ensure a snapshot is recorded if the system requires snapshot determinism; otherwise, mark snapshot creation consistent with existing patterns. Snapshots reference the report and may store `snapshot_status` and `snapshot_reason`.
 *
 * 6) Remove report from active list
 * - Set `community_platform_reports.deleted_at = now()` for the report row (since the schema provides `deleted_at`).
 * - Do not modify the reported content referenced by `community_platform_report_targets` (no deletes on the target content tables).
 *
 * 7) Transactionality
 * - Perform steps 3-6 in a single DB transaction:
 *   - If resolution creation/update fails, rollback report deletion.
 *
 * 8) Response
 * - Return HTTP 204 with an empty JSON body, represented by `responseBody: null` in the API operation.
 *
 * Edge cases
 * - Report already removed/hidden: return not-found.
 * - Missing moderation authority: return forbidden.
 * - Non-existent reportId: return not-found.
 * @path /communityPlatform/member/reports/:reportId
 * @accessor api.functional.communityPlatform.member.reports.erase
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function erase(
  connection: IConnection,
  props: erase.Props,
): Promise<void> {
  return true === connection.simulate
    ? erase.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...erase.METADATA,
          path: erase.path(props),
          status: null,
        },
      );
}
export namespace erase {
  export type Props = {
    /**
     * Identifier of the report to be dismissed/removed from the active report list.
     */
    reportId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/communityPlatform/member/reports/:reportId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/member/reports/${encodeURIComponent(props.reportId ?? "null")}`;
  export const random = (): void => typia.random<void>();
  export const simulate = (
    connection: IConnection,
    props: erase.Props,
  ): void => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: erase.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("reportId")(() => typia.assert(props.reportId));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}
