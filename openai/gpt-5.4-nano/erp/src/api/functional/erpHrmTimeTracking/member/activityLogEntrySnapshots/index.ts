import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IErpHrmTimeTrackingActivityLogEntrySnapshot } from "../../../../structures/IErpHrmTimeTrackingActivityLogEntrySnapshot";
import { IPageIErpHrmTimeTrackingActivityLogEntrySnapshot } from "../../../../structures/IPageIErpHrmTimeTrackingActivityLogEntrySnapshot";

/**
 * Create an organization-scoped point-in-time snapshot for an activity log entry.
 *
 * This endpoint records an immutable audit context so that historical activity can be queried safely even if the underlying business entities change later. The snapshot captures:
 * - which organization the audit trail belongs to,
 * - who performed the action (performer_type + performer_id),
 * - what action type and summary were involved,
 * - which target entity was affected (target_entity_type + target_entity_id),
 * - optional human-readable target_additional_info,
 * - and the snapshot creation/record timestamps.
 *
 * Authorization is enforced in the currently selected organization context: the snapshot’s {@link erp_hrm_time_tracking_activity_log_entry_snapshots.erp_hrm_time_tracking_organization_id} must match the request actor’s active organization, preventing cross-tenant leakage.
 *
 * Business-validation requirements also apply to avoid misleading auditing. If an attempted operation fails business validation and is treated as rejected, the system must not create a misleading “successful” activity log snapshot for that rejected action. When rejection occurs, the activity log should contain the appropriate rejection information only if the rejection actually happened, and the snapshot should reflect the true outcome.
 *
 * Relationship-wise, the snapshot row belongs to a specific {@link erp_hrm_time_tracking_activity_log_entries} record via {@link erp_hrm_time_tracking_activity_log_entry_snapshots.erp_hrm_time_tracking_activity_log_entry_id}. The snapshot creation must therefore ensure the referenced activity log entry is consistent with the snapshot’s performer and target fields.
 *
 * Timestamps must be consistent for audit correctness: store the snapshot created_at/updated_at at the time of snapshot persistence, and ensure the performer recorded in the snapshot corresponds to the member who initiated the significant action within the organization.
 *
 * If validation fails (e.g., organization mismatch, missing required linkage data, or invalid actor/target combinations), the endpoint rejects the request without producing any partial snapshot state. Unhandled internal failures must not result in a snapshot being persisted if the snapshot would be inconsistent with the true business outcome.
 *
 * @param props.connection
 * @param props.body Creation payload for a point-in-time snapshot of an activity log entry audit trail.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implementation steps:
 *
 * 1) Parse IErpHrmTimeTrackingActivityLogEntrySnapshot.ICreate request.
 * 2) Validate tenant isolation:
 *    - Resolve the caller’s selected organization context.
 *    - Ensure request.erpHrmTimeTrackingOrganizationId (mapped from ICreate) matches the caller organization.
 * 3) Validate linkage consistency:
 *    - If the request includes erpHrmTimeTrackingActivityLogEntryId, ensure the activity log entry exists and belongs to the same organization.
 *    - Ensure performer_type/performer_id in the request match the activity log entry’s performer (performed_by_member_id) representation rules.
 * 4) Prevent misleading auditing for rejected actions:
 *    - If the request indicates (directly or indirectly via action_type/outcome fields carried by the referenced log entry) that the attempted business action was rejected, do not persist the snapshot.
 *    - This aligns with the rule that rejected actions must not create misleading “successful” log entries.
 * 5) Build persistence model:
 *    - Insert into erp_hrm_time_tracking_activity_log_entry_snapshots using:
 *      - erp_hrm_time_tracking_activity_log_entry_id
 *      - erp_hrm_time_tracking_organization_id
 *      - snapshot_action_type, snapshot_action_summary
 *      - performer_type, performer_id
 *      - target_entity_type, target_entity_id
 *      - target_additional_info (nullable)
 *      - created_at = now(), updated_at = now()
 *      - deleted_at = null
 * 6) Transactionality:
 *    - Perform insertion in a DB transaction.
 *    - If any validation or referential check fails, roll back and return a rejection error.
 * 7) Response:
 *    - Return the created snapshot entity as IErpHrmTimeTrackingActivityLogEntrySnapshot.
 *
 * Edge cases:
 * - referenced activity log entry exists but organization_id differs -> reject.
 * - target_entity_type/id missing or invalid -> reject.
 * - performer_id does not match the caller/linked entry performer -> reject.
 * - if the action was rejected -> do not insert snapshot.
 *
 * Error handling:
 * - For business-rule rejections: return a clear human-readable message describing what prevented completion.
 * - For unexpected internal errors: do not persist inconsistent snapshot state and do not create misleading activity log artifacts.
 * @path /erpHrmTimeTracking/member/activityLogEntrySnapshots
 * @accessor api.functional.erpHrmTimeTracking.member.activityLogEntrySnapshots.create
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
     * Creation payload for a point-in-time snapshot of an activity log entry audit trail.
     */
    body: IErpHrmTimeTrackingActivityLogEntrySnapshot.ICreate;
  };
  export type Body = IErpHrmTimeTrackingActivityLogEntrySnapshot.ICreate;
  export type Response = IErpHrmTimeTrackingActivityLogEntrySnapshot;

  export const METADATA = {
    method: "POST",
    path: "/erpHrmTimeTracking/member/activityLogEntrySnapshots",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () =>
    "/erpHrmTimeTracking/member/activityLogEntrySnapshots";
  export const random = (): IErpHrmTimeTrackingActivityLogEntrySnapshot =>
    typia.random<IErpHrmTimeTrackingActivityLogEntrySnapshot>();
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
 * Retrieve a paginated list of activity log entry snapshots for browsing and audit inspection within the currently selected organization context.
 *
 * This endpoint queries `erp_hrm_time_tracking_activity_log_entry_snapshots`, which stores point-in-time immutable records of activity log entries. Each snapshot captures the audit-relevant context (snapshot action type/summary, performer identity reference, and polymorphic target entity reference) as it existed when the original activity was recorded.
 *
 * The underlying table is tenant-scoped via `erp_hrm_time_tracking_activity_log_entry_snapshots.erp_hrm_time_tracking_organization_id`, and query results must be restricted to the current organization context to prevent cross-organization leakage.
 *
 * Filtering typically includes criteria such as:
 * - snapshot action type / summary keyword search (leveraging the gin trigram index on `snapshot_action_summary`)
 * - performer identity reference type/id (for actor-based browsing)
 * - target entity type/id (for polymorphic targeting)
 * - optional text match on `target_additional_info` (leveraging the gin trigram index)
 * - time windows using `created_at`
 *
 * Pagination and sorting should be applied on top of these filters so the client can efficiently navigate audit history. The service should construct a single database query that honors the supplied search criteria, and return only the requested page.
 *
 * Security and authorization: only authenticated `member` actors are expected to use protected browsing features. Even when a member belongs to multiple organizations, this endpoint must enforce selection of a single active organization context so that the returned snapshots are limited to that organization.
 *
 * Error handling: for any rejection or failure-case, the system returns a clear human-readable explanation of what prevented completion without exposing sensitive organization data. The browsing operation should not return partial data for a failed request; instead, it should fail the whole operation.
 *
 * Related operations: clients commonly use this browsing endpoint to find relevant snapshot records and then navigate to other entity views (outside the scope of this endpoint) using the snapshot’s `target_entity_type` and `target_entity_id` references.
 *
 * @param props.connection
 * @param props.body Search filters and pagination controls for activity log entry snapshots.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement organization-scoped snapshot search with pagination.
 *
 * Implementation steps:
 * 1) Authorize caller as a member for audit log browsing.
 * 2) Resolve the caller’s currently selected organization context (organization_id) and enforce it as a mandatory filter.
 * 3) Parse requestBody (IAErpHrmTimeTrackingActivityLogEntrySnapshot.IRequest) for:
 *    - pagination: page size/limit and cursor/offset fields per DTO conventions
 *    - sorting: allowed sort fields should map to `created_at` (and optionally `updated_at`/`erp_hrm_time_tracking_activity_log_entry_id` if DTO supports it)
 *    - filtering: snapshot_action_type, keyword/text search for snapshot_action_summary, performer_type+performer_id, target_entity_type+target_entity_id, target_additional_info keyword, created_at range.
 * 4) Build a Prisma query against `erp_hrm_time_tracking_activity_log_entry_snapshots`:
 *    - mandatory: `erp_hrm_time_tracking_organization_id = <selectedOrgId>`
 *    - apply optional filters only when provided
 *    - implement keyword/text search using ILIKE/contains semantics so it benefits from gin trigram indexes on `snapshot_action_summary` and `target_additional_info`.
 * 5) Apply ordering and pagination in the database query (do not load all rows).
 * 6) Map results to response DTO summaries (IAErpHrmTimeTrackingActivityLogEntrySnapshot.ISummary) and wrap with pagination container (IPage...).
 * 7) Return consistent errors for invalid filter combinations, missing required filter fields (if any), and authorization failures.
 *
 * Edge cases:
 * - If no snapshots match, return an empty paginated list.
 * - If the requested page exceeds available results, return the empty list for that page or an appropriate pagination error according to DTO rules.
 * - Ensure soft-deleted snapshot rows (deleted_at != null) are either excluded or included depending on the DTO’s explicit behavior; default to excluding logically deleted snapshot rows unless the request specifies otherwise (do not assume—follow DTO semantics).
 * @path /erpHrmTimeTracking/member/activityLogEntrySnapshots
 * @accessor api.functional.erpHrmTimeTracking.member.activityLogEntrySnapshots.index
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
     * Search filters and pagination controls for activity log entry snapshots.
     */
    body: IErpHrmTimeTrackingActivityLogEntrySnapshot.IRequest;
  };
  export type Body = IErpHrmTimeTrackingActivityLogEntrySnapshot.IRequest;
  export type Response =
    IPageIErpHrmTimeTrackingActivityLogEntrySnapshot.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/erpHrmTimeTracking/member/activityLogEntrySnapshots",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () =>
    "/erpHrmTimeTracking/member/activityLogEntrySnapshots";
  export const random =
    (): IPageIErpHrmTimeTrackingActivityLogEntrySnapshot.ISummary =>
      typia.random<IPageIErpHrmTimeTrackingActivityLogEntrySnapshot.ISummary>();
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
 * Retrieve a single activity log entry snapshot by its identifier.
 *
 * This endpoint returns the point-in-time, immutable view of an audit activity log entry as it existed when the snapshot row was created. The returned data is based on the `erp_hrm_time_tracking_activity_log_entry_snapshots` model, which stores snapshot-specific action categorization (`snapshot_action_type`), snapshot summary (`snapshot_action_summary`), performer identity information (`performer_type`, `performer_id`), and the targeted business entity reference (`target_entity_type`, `target_entity_id`).
 *
 * Security and authorization are enforced at the organization context layer. Because activity log data is organization-owned (`organization_id` links to `erp_hrm_time_tracking_organizations`), the implementation must ensure the requesting member can only access snapshots belonging to the currently selected organization. When the request is not authorized for the selected organization, the operation must be rejected with a consistent error response (and must not leak other organizations’ audit metadata).
 *
 * Validation and error handling: if the provided `activityLogEntrySnapshotId` does not exist (or exists but is not accessible for the current organization context), the system should respond with a not-found or access-denied outcome as appropriate to the service’s error policy. The endpoint must return the snapshot record without mutating any state. If snapshot records have been marked with `deleted_at`, the implementation must apply the service’s visibility policy consistently (either excluding them from standard reads or returning them only when the policy allows).
 *
 * Related operations: this snapshot retrieval is complementary to list/search operations over activity logs (for org:manage users) and to viewing the live activity log entry. Use the snapshot endpoint when audit history at a specific time is required; use the live activity log entry view when the latest representation is sufficient.
 *
 * @param props.connection
 * @param props.activityLogEntrySnapshotId Identifier of the activity log entry snapshot row to retrieve.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement a read-only lookup for `erp_hrm_time_tracking_activity_log_entry_snapshots` by primary key `id`.
 *
 * 1) Parse `activityLogEntrySnapshotId` from the path and validate it as a UUID.
 * 2) Resolve the currently selected organization from the authenticated member/session context.
 * 3) Query `erp_hrm_time_tracking_activity_log_entry_snapshots` with:
 *    - `id = activityLogEntrySnapshotId`
 *    - `erp_hrm_time_tracking_activity_log_entry_snapshots.erp_hrm_time_tracking_organization_id = selectedOrganizationId`
 *    This ensures tenant isolation for snapshot reads.
 * 4) If no row matches, return an appropriate rejection/404 outcome per the system’s error policy.
 * 5) Map database fields to the response DTO:
 *    - `id`
 *    - `erp_hrm_time_tracking_activity_log_entry_id` (exposed as the snapshot’s parent activity log entry id)
 *    - `erp_hrm_time_tracking_organization_id`
 *    - `snapshot_action_type`
 *    - `snapshot_action_summary`
 *    - `performer_type`, `performer_id`
 *    - `target_entity_type`, `target_entity_id`
 *    - `target_additional_info`
 *    - `created_at`, `updated_at`
 *    - `deleted_at` (include only if the DTO expects it; otherwise omit in mapping).
 * 6) Ensure no activity log entries are created during this operation (pure read).
 *
 * Edge cases:
 * - If the snapshot exists but belongs to a different organization, treat it as not accessible (do not return snapshot details).
 * - If UUID validation fails, reject with a validation error consistent with other endpoints.
 *
 * No transactions are required because this is a read-only operation.
 * @path /erpHrmTimeTracking/member/activityLogEntrySnapshots/:activityLogEntrySnapshotId
 * @accessor api.functional.erpHrmTimeTracking.member.activityLogEntrySnapshots.at
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
     * Identifier of the activity log entry snapshot row to retrieve.
     */
    activityLogEntrySnapshotId: string & tags.Format<"uuid">;
  };
  export type Response = IErpHrmTimeTrackingActivityLogEntrySnapshot;

  export const METADATA = {
    method: "GET",
    path: "/erpHrmTimeTracking/member/activityLogEntrySnapshots/:activityLogEntrySnapshotId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/erpHrmTimeTracking/member/activityLogEntrySnapshots/${encodeURIComponent(props.activityLogEntrySnapshotId ?? "null")}`;
  export const random = (): IErpHrmTimeTrackingActivityLogEntrySnapshot =>
    typia.random<IErpHrmTimeTrackingActivityLogEntrySnapshot>();
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
      assert.param("activityLogEntrySnapshotId")(() =>
        typia.assert(props.activityLogEntrySnapshotId),
      );
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
