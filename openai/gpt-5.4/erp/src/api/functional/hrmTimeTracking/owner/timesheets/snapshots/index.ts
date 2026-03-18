import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IHrmTimeTrackingTimesheetSnapshot } from "../../../../../structures/IHrmTimeTrackingTimesheetSnapshot";
import { IPageIHrmTimeTrackingTimesheetSnapshot } from "../../../../../structures/IPageIHrmTimeTrackingTimesheetSnapshot";

/**
 * Create a point-in-time snapshot record for a specific weekly timesheet.
 *
 * This operation creates a child record under the weekly timesheet stored in `hrm_time_tracking_timesheets`, which is described as the organization-scoped weekly record owned by one employee for a Monday-to-Sunday reporting period. The snapshot is stored in `hrm_time_tracking_timesheet_snapshots`, a normalized subsidiary table that preserves snapshot-specific state for one source timesheet without duplicating the parent row. In particular, the snapshot captures whether the source timesheet was locked against modification at the time of capture, supporting workflow audit interpretation during submission, approval, rejection, and later historical review.
 *
 * Access to this operation must be evaluated in the currently selected organization context. Because the parent timesheet belongs to one organization and one employee, the server must first resolve the target timesheet by `timesheetId`, confirm that it belongs to the active organization, and reject attempts to operate on timesheets outside that scope. This follows the organization-scoped access rules requiring role and permission evaluation to be performed separately for each organization. The operation is intended for authorized workflow actors such as owners and managers, or internal workflow execution paths that preserve review history as part of submission and review processing.
 *
 * This operation is closely related to the weekly timesheet submission and review journey. When a timesheet moves through draft, submitted, approved, and rejected states, the platform must preserve review-relevant historical context. The parent timesheet stores workflow status, submission and review timestamps, and any rejection reason, while this snapshot child records the locked state that helps explain whether the weekly record was modifiable at that moment. This is especially relevant after approval, when included timelogs become locked against further employee editing or deletion, and after rejection, when a timesheet may return to draft and become modifiable again.
 *
 * The request body should contain only snapshot-specific creation data and must not repeat the parent timesheet identifier. The server derives the relationship from the route parameter and must ignore or reject any attempt to override parent linkage through client payload. If the target timesheet does not exist, belongs to another organization, has been deleted, or the caller lacks permission in the current organization, the operation must fail with a clear authorization or not-found outcome. The operation should also avoid creating misleading duplicate records during timeout or retry situations, because timeout handling must not leave business history in an indeterminate state.
 *
 * @param props.connection
 * @param props.timesheetId Target timesheet's unique identifier
 * @param props.body Snapshot creation data for the target timesheet
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor owner
 * @x-autobe-specification Implement a create-snapshot service for the subsidiary `hrm_time_tracking_timesheet_snapshots` table.
 *
 * 1. Resolve the authenticated actor and active organization context. Authorize only actors permitted to preserve or manage timesheet review history in that organization, such as owner and manager permissions for timesheet approval or administrative oversight. Deny employee self-service creation unless an internal business rule explicitly delegates this through a controlled workflow.
 *
 * 2. Load the parent row from `hrm_time_tracking_timesheets` by `id = :timesheetId`. The query must verify:
 * - the row exists;
 * - `deleted_at IS NULL` so inactive records are not snapshotted through normal API use;
 * - the row belongs to the currently selected organization via `hrm_time_tracking_organization_id`.
 * If any check fails, return an appropriate not-found or forbidden error without leaking cross-organization existence details.
 *
 * 3. Validate the request body against `IHrmTimeTrackingTimesheetSnapshot.ICreate`. The writable business field represented by the loaded snapshot schema is `locked`. Treat the parent foreign key as server-controlled and never accept it from the client. If the request attempts to encode unsupported parent linkage semantics through extra fields at a higher layer, reject the request.
 *
 * 4. Insert a new row into `hrm_time_tracking_timesheet_snapshots` with:
 * - a newly generated UUID `id`;
 * - `hrm_time_tracking_timesheet_id` populated from the path parameter;
 * - `locked` populated from the request body.
 * Use a transaction boundary if snapshot creation is part of a larger workflow state transition, such as submit, approve, or reject processing, so that the historical capture and parent workflow update commit atomically.
 *
 * 5. Return the created snapshot resource as `IHrmTimeTrackingTimesheetSnapshot`. Include the generated identifier, the parent timesheet linkage, and the captured locked state according to the DTO schema.
 *
 * 6. Operational safeguards:
 * - keep the operation organization-scoped at every step;
 * - do not mutate parent workflow columns here unless this endpoint is orchestrated within a larger workflow transaction;
 * - ensure retries or timeout recovery do not silently create misleading duplicate historical records for one logical workflow event;
 * - log the creation in application telemetry or related activity mechanisms if the broader implementation uses such observability, but do not invent a separate business entity mutation outside the loaded schema.
 *
 * 7. Error handling:
 * - 404-style outcome when the parent timesheet cannot be resolved in the current organization scope;
 * - 403-style outcome when the actor lacks permission;
 * - 400-style outcome for invalid payload semantics;
 * - conflict handling if upstream orchestration enforces one snapshot per transition event and a duplicate logical capture is attempted.
 * @path /hrmTimeTracking/owner/timesheets/:timesheetId/snapshots
 * @accessor api.functional.hrmTimeTracking.owner.timesheets.snapshots.create
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
          path: create.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace create {
  export type Props = {
    /**
     * Target timesheet's unique identifier
     */
    timesheetId: string & tags.Format<"uuid">;

    /**
     * Snapshot creation data for the target timesheet
     */
    body: IHrmTimeTrackingTimesheetSnapshot.ICreate;
  };
  export type Body = IHrmTimeTrackingTimesheetSnapshot.ICreate;
  export type Response = IHrmTimeTrackingTimesheetSnapshot;

  export const METADATA = {
    method: "POST",
    path: "/hrmTimeTracking/owner/timesheets/:timesheetId/snapshots",
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
    `/hrmTimeTracking/owner/timesheets/${encodeURIComponent(props.timesheetId ?? "null")}/snapshots`;
  export const random = (): IHrmTimeTrackingTimesheetSnapshot =>
    typia.random<IHrmTimeTrackingTimesheetSnapshot>();
  export const simulate = (
    connection: IConnection,
    props: create.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: create.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("timesheetId")(() => typia.assert(props.timesheetId));
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
 * Retrieve a paginated history of snapshot records captured for a specific timesheet.
 *
 * This operation returns point-in-time snapshot entries associated with one weekly timesheet in the current organization context. The underlying `hrm_time_tracking_timesheet_snapshots` table is described as a child snapshot model for `hrm_time_tracking_timesheets`, preserving whether the source timesheet was locked at the moment each snapshot was captured. The parent timesheet stores the weekly workflow state, including `week_start_date`, `week_end_date`, `status`, `submitted_at`, `reviewed_at`, and `rejection_reason`, while the snapshot child records preserve historical capture state used for audit interpretation of approval and rejection workflows.
 *
 * Access to this endpoint is organization-scoped and must follow current-organization permission evaluation. An employee may use it only for a timesheet they own. Owners and managers may use it when they are allowed to review or view the target timesheet within the active organization. The system must not allow a role from another organization to grant access here, and the operation must not expose snapshot history for timesheets outside the currently selected organization context.
 *
 * This endpoint is intended for history and audit-oriented viewing, not mutation. Snapshot records are system-managed historical artifacts, and consumers should treat them as read-only evidence of timesheet state preservation. In particular, the snapshots complement the timesheet approval lifecycle in which submitted timesheets can be approved or rejected, review outcomes record `reviewed_at`, rejected outcomes require `rejection_reason`, and approved outcomes lock included timelogs from further editing or deletion. The snapshot list helps clients present that preserved workflow history without changing the parent timesheet.
 *
 * Because this is a list retrieval endpoint, clients should call it when they need to browse multiple snapshot entries for one timesheet, typically for audit displays, review history views, or workflow trace panels. The endpoint supports paginated retrieval and may support lightweight filtering and sorting defined by the request DTO. If the parent timesheet does not exist, is not visible in the current organization context, or the caller lacks the required permission, the operation must fail clearly rather than returning ambiguous or cross-organization data.
 *
 * @param props.connection
 * @param props.timesheetId Target timesheet's ID
 * @param props.body Pagination and filter criteria for timesheet snapshots
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor owner
 * @x-autobe-specification 1. Resolve the active authenticated actor and active organization context from the session.
 * 2. Load the parent record from `hrm_time_tracking_timesheets` by `id = :timesheetId` and `deleted_at IS NULL`. If no row exists, return a not-found error.
 * 3. Verify that the parent timesheet belongs to the active organization by comparing `hrm_time_tracking_organization_id` against the session organization context. If it does not match, deny access.
 * 4. Authorize access according to business rules:
 *    - If the caller is an employee actor, allow only when the employee account corresponds to `hrm_time_tracking_employee_id` of the parent timesheet.
 *    - If the caller is an owner or manager, require permission to review timesheets or view the target timesheet in the current organization context.
 *    - Deny access when permission is absent, even if the caller has similar authority in another organization.
 * 5. Query `hrm_time_tracking_timesheet_snapshots` filtered by `hrm_time_tracking_timesheet_id = :timesheetId`.
 * 6. Apply request-driven pagination and deterministic ordering. Default ordering should be stable, such as newest logical snapshot first by snapshot identifier or another supported deterministic sort defined in the DTO implementation. Do not invent business data beyond stored snapshot fields.
 * 7. Build summary rows from snapshot records. Include snapshot identity and the preserved `locked` value. If the DTO layer includes parent-derived contextual fields, derive them from the already loaded parent timesheet rather than issuing repeated queries.
 * 8. Return the result as `IPageIHrmTimeTrackingTimesheetSnapshot.ISummary` with pagination metadata and snapshot summary data.
 * 9. Error handling:
 *    - Return not found when the timesheet does not exist or is deleted.
 *    - Return forbidden when the caller cannot access the parent timesheet in the active organization.
 *    - Return validation failure when pagination or filter inputs are invalid.
 * 10. This operation is read-only. It must not create, update, or remove snapshot records, and it must not alter the parent timesheet, included timelogs, review state, or lock state as a side effect.
 * @path /hrmTimeTracking/owner/timesheets/:timesheetId/snapshots
 * @accessor api.functional.hrmTimeTracking.owner.timesheets.snapshots.index
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
          path: index.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace index {
  export type Props = {
    /**
     * Target timesheet's ID
     */
    timesheetId: string & tags.Format<"uuid">;

    /**
     * Pagination and filter criteria for timesheet snapshots
     */
    body: IHrmTimeTrackingTimesheetSnapshot.IRequest;
  };
  export type Body = IHrmTimeTrackingTimesheetSnapshot.IRequest;
  export type Response = IPageIHrmTimeTrackingTimesheetSnapshot.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/hrmTimeTracking/owner/timesheets/:timesheetId/snapshots",
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
    `/hrmTimeTracking/owner/timesheets/${encodeURIComponent(props.timesheetId ?? "null")}/snapshots`;
  export const random = (): IPageIHrmTimeTrackingTimesheetSnapshot.ISummary =>
    typia.random<IPageIHrmTimeTrackingTimesheetSnapshot.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: index.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: index.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("timesheetId")(() => typia.assert(props.timesheetId));
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
 * Retrieve one historical snapshot record for a specific weekly timesheet.
 *
 * This operation returns a point-in-time snapshot stored for a source record in the weekly timesheet workflow. The parent timesheet represents a Monday-to-Sunday reporting period owned by one organization employee, and it stores workflow attributes such as the reporting week boundaries, current status, submission timestamp, review timestamp, and optional rejection reason. The child snapshot record preserves snapshot-specific state for that source timesheet, including whether the timesheet was locked against modification at the moment the snapshot was captured. Because the snapshot is normalized as a child record of the source timesheet, it must be accessed through the parent timesheet resource rather than as a top-level standalone entity.
 *
 * Access to this operation is organization-scoped. The system must return the snapshot only when the caller is entitled to view the parent timesheet in the currently selected organization context. This includes the employee who owns the timesheet for self-view and users who can approve or review submitted timesheets in that same organization. Role and permission checks must be evaluated only against the active organization context, and permissions from another organization must not grant access.
 *
 * The returned data is intended to support workflow audit interpretation and historical review of a timesheet record. The source timesheet stores the regular weekly workflow state, while the snapshot preserves a captured historical condition related to modification locking. This makes the operation suitable for detail views, review histories, and traceability features that need to inspect how the timesheet existed at a particular capture event.
 *
 * Clients typically reach this operation after obtaining a parent timesheet through the timesheet viewing and listing APIs. For example, a user may first load a paginated timesheet list filtered by status or date range, then open one timesheet detail, and finally request a specific snapshot beneath that timesheet. If the referenced snapshot does not belong to the referenced timesheet, if the parent timesheet is not available in the current organization context, or if the caller lacks permission to view that timesheet, the operation must fail with an appropriate authorization or not-found outcome rather than exposing cross-record or cross-organization information.
 *
 * @param props.connection
 * @param props.timesheetId Target parent timesheet ID in the current organization context
 * @param props.timesheetSnapshotId Target snapshot ID belonging to the specified timesheet
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor owner
 * @x-autobe-specification Implement this operation as a read-only detail lookup on hrm_time_tracking_timesheet_snapshots joined to hrm_time_tracking_timesheets.
 *
 * First, resolve the caller's active organization context and authorization scope. Permit access only when the caller is the employee owner of the parent timesheet for self-view, or the caller is an owner or manager with organization-scoped permission to review or view timesheets in the current organization. Permission checks must use only the active organization context.
 *
 * Query the parent timesheet by id using timesheetId and ensure it belongs to the active organization through hrm_time_tracking_timesheets.hrm_time_tracking_organization_id. The parent lookup should also exclude rows that are logically removed when deleted_at is not null unless the broader platform explicitly allows historical deleted-record inspection. Then query the snapshot by timesheetSnapshotId and validate that hrm_time_tracking_timesheet_snapshots.hrm_time_tracking_timesheet_id exactly matches the resolved parent timesheet id. Prefer a single joined query or a two-step lookup inside the same request flow, but always enforce the parent-child association.
 *
 * Return a detailed IHrmTimeTrackingTimesheetSnapshot response containing the snapshot record and its relationship-ready identifiers needed by downstream consumers. The response should reflect the stored locked flag exactly as captured at snapshot time. Do not recalculate or overwrite snapshot state from the current parent timesheet because the purpose of the record is historical preservation.
 *
 * If the parent timesheet is missing, outside the active organization, or not visible to the caller, return a not-found or forbidden result according to platform standards without leaking whether another organization owns the record. If the snapshot id exists but is not attached to the specified timesheet, treat the request as invalid resource pairing and return a not-found style outcome. This operation is read-only and must not modify timesheet, snapshot, review, or timelog data.
 * @path /hrmTimeTracking/owner/timesheets/:timesheetId/snapshots/:timesheetSnapshotId
 * @accessor api.functional.hrmTimeTracking.owner.timesheets.snapshots.at
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
     * Target parent timesheet ID in the current organization context
     */
    timesheetId: string & tags.Format<"uuid">;

    /**
     * Target snapshot ID belonging to the specified timesheet
     */
    timesheetSnapshotId: string & tags.Format<"uuid">;
  };
  export type Response = IHrmTimeTrackingTimesheetSnapshot;

  export const METADATA = {
    method: "GET",
    path: "/hrmTimeTracking/owner/timesheets/:timesheetId/snapshots/:timesheetSnapshotId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/hrmTimeTracking/owner/timesheets/${encodeURIComponent(props.timesheetId ?? "null")}/snapshots/${encodeURIComponent(props.timesheetSnapshotId ?? "null")}`;
  export const random = (): IHrmTimeTrackingTimesheetSnapshot =>
    typia.random<IHrmTimeTrackingTimesheetSnapshot>();
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
      assert.param("timesheetId")(() => typia.assert(props.timesheetId));
      assert.param("timesheetSnapshotId")(() =>
        typia.assert(props.timesheetSnapshotId),
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
