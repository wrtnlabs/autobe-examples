import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IHrmTimeTrackingTimelog } from "../../../../../structures/IHrmTimeTrackingTimelog";
import { IHrmTimeTrackingTimesheet } from "../../../../../structures/IHrmTimeTrackingTimesheet";
import { IHrmTimeTrackingTimesheetTimelog } from "../../../../../structures/IHrmTimeTrackingTimesheetTimelog";
import { IPageIHrmTimeTrackingTimelog } from "../../../../../structures/IPageIHrmTimeTrackingTimelog";

/**
 * Add a timelog to a specific draft weekly timesheet.
 *
 * This operation appends one historical time entry to the composition of a weekly timesheet identified by `timesheetId`. The target parent record corresponds to the `hrm_time_tracking_timesheets` table, which stores the Monday-to-Sunday reporting period, workflow status, submission timestamp, review timestamp, and optional rejection reason for an employee-owned weekly record. The added child relation is persisted through the normalized `hrm_time_tracking_timesheet_timelogs` table, whose purpose is to store one row for each included timelog rather than embedding arrays or denormalized aggregates on the parent timesheet.
 *
 * The operation exists to support the draft composition workflow described in the requirements. A weekly timesheet is automatically built for a specific week and initially includes the employee's timelogs for that same week, but while the timesheet remains in draft status the employee can still add timelogs to or remove timelogs from that draft. This endpoint therefore serves the manual adjustment part of that journey. It is intended for the timesheet owner within the current organization context, and it must reject attempts to modify a timesheet once it has moved beyond draft because submitted timesheets enter review and approved timesheets cause all included timelogs to become locked from further editing or deletion.
 *
 * The added timelog must be a real `hrm_time_tracking_timelogs` record that belongs to the same organization context as the target timesheet and to the same employee who owns that timesheet. The timelog itself represents a raw historical time entry with a worked date, whole-minute duration, billable flag, optional description, required project reference, and optional task reference. Because the inclusion table enforces that each timelog can belong to at most one timesheet at a time, this operation must also reject any attempt to add a timelog that is already attached to another timesheet. After the inclusion is created, the timesheet should be returned in refreshed form so clients can display the updated weekly record and its included timelogs together.
 *
 * This operation is commonly used after opening or retrieving the draft weekly timesheet detail. Related operations that list or fetch timesheets help users find the correct weekly record first, and complementary remove operations on the same nested timelog collection would be used when a draft needs to be corrected before submission. Once the employee later submits the timesheet for approval, further composition changes should no longer be accepted by this endpoint.
 *
 * @param props.connection
 * @param props.timesheetId Target weekly timesheet ID
 * @param props.body Timelog inclusion information
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor employee
 * @x-autobe-specification Implement a service action that creates one inclusion row in `hrm_time_tracking_timesheet_timelogs` for the parent timesheet identified by `timesheetId`.
 *
 * 1. Authorize the caller in the current organization context. The primary allowed actor is the employee who owns the target timesheet. If the platform later supports delegated draft editing by privileged roles, enforce that through explicit permission checks, but do not bypass organization scoping.
 * 2. Load the target row from `hrm_time_tracking_timesheets` by `id = timesheetId` and `deleted_at IS NULL`. If it does not exist, return a not-found error.
 * 3. Verify the target timesheet is editable. The operation must allow composition changes only when `status` is `draft`. Reject requests for `submitted`, `approved`, or `rejected` timesheets unless a separate business rule explicitly reopens them to draft before this operation is called.
 * 4. Load the target timelog from `hrm_time_tracking_timelogs` by request-body timelog identifier and `deleted_at IS NULL`. If it does not exist, return a not-found error.
 * 5. Enforce ownership and scope consistency:
 *    - `hrm_time_tracking_timelogs.hrm_time_tracking_organization_id` must equal `hrm_time_tracking_timesheets.hrm_time_tracking_organization_id`.
 *    - `hrm_time_tracking_timelogs.hrm_time_tracking_employee_id` must equal `hrm_time_tracking_timesheets.hrm_time_tracking_employee_id`.
 *    - The timelog should belong to the reporting week bounded by `week_start_date` and `week_end_date` of the timesheet. Reject out-of-range timelogs.
 * 6. Check whether the timelog is already included in any non-deleted row of `hrm_time_tracking_timesheet_timelogs`. Because the schema has `@@unique([hrm_time_tracking_timelog_id])`, prevent duplicate association and translate uniqueness conflicts into a business validation error.
 * 7. Within a transaction, insert the inclusion row with a new UUID, `hrm_time_tracking_timesheet_id = timesheetId`, `hrm_time_tracking_timelog_id` from the request body, and current timestamps for `created_at` and `updated_at`.
 * 8. Re-read the timesheet with its included timelog relations so the response reflects the updated composition. Derived values such as total hours should be computed from linked timelogs at read time rather than stored on `hrm_time_tracking_timesheets`, because the schema explicitly keeps calculated totals out of the regular timesheet table.
 * 9. Return the refreshed timesheet detail.
 *
 * Error handling requirements:
 * - Not found when the timesheet or timelog does not exist in active records.
 * - Forbidden when the caller is outside the owning organization context or is not allowed to edit that timesheet.
 * - Conflict or validation error when the timesheet is not in draft status.
 * - Validation error when the timelog belongs to another employee, another organization, or a date outside the weekly reporting range.
 * - Conflict when the timelog is already attached to another timesheet.
 *
 * Implementation notes:
 * - Respect the historical nature of timelogs; this operation only changes inclusion, not the underlying timelog content.
 * - Do not modify `submitted_at`, `reviewed_at`, or `rejection_reason` in this operation.
 * - Do not unlock or alter any approved-timesheet state through this endpoint.
 * @path /hrmTimeTracking/employee/timesheets/:timesheetId/timelogs
 * @accessor api.functional.hrmTimeTracking.employee.timesheets.timelogs.create
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
     * Target weekly timesheet ID
     */
    timesheetId: string & tags.Format<"uuid">;

    /**
     * Timelog inclusion information
     */
    body: IHrmTimeTrackingTimesheetTimelog.ICreate;
  };
  export type Body = IHrmTimeTrackingTimesheetTimelog.ICreate;
  export type Response = IHrmTimeTrackingTimesheet;

  export const METADATA = {
    method: "POST",
    path: "/hrmTimeTracking/employee/timesheets/:timesheetId/timelogs",
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
    `/hrmTimeTracking/employee/timesheets/${encodeURIComponent(props.timesheetId ?? "null")}/timelogs`;
  export const random = (): IHrmTimeTrackingTimesheet =>
    typia.random<IHrmTimeTrackingTimesheet>();
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
 * Retrieve a filtered and paginated list of timelogs that are currently included in a specific weekly timesheet.
 *
 * This operation is used to inspect the detailed work entries attached to one timesheet record. The underlying timesheet entity is a weekly record owned by an organization employee for a Monday-to-Sunday reporting period, and the included timelogs are not stored as an array on the timesheet itself. Instead, the relationship is normalized through explicit inclusion records in `hrm_time_tracking_timesheet_timelogs`, which attach individual `hrm_time_tracking_timelogs` rows to the parent `hrm_time_tracking_timesheets` row. As described by the schema comments, this supports draft composition changes without denormalized aggregates and preserves a clear weekly submission context for each included timelog.
 *
 * Access to this operation must remain organization-scoped. The caller may view only a timesheet that belongs to the currently selected organization and that is permitted by the caller's role. Employees may use this operation to inspect timelogs included in their own timesheet. Owners and managers may use it to review submitted or approved timesheets within the same organization as part of the weekly review workflow. This aligns with the requirement that submitted timesheets present the employee, week, included timelogs, and calculated total hours to users who can approve timesheets, and that approved timesheets continue to present the included timelogs together with the approved weekly record.
 *
 * The returned timelog data is based on the transactional work-history model in `hrm_time_tracking_timelogs`, which stores the organization context, employee, project, optional task, work date, duration in whole minutes, optional work description, and billable flag. Because timelogs remain as historical records even when an employee is deactivated, this operation should continue to expose already included historical entries when the parent timesheet is still visible. When the parent timesheet has reached approved status, consumers should treat the returned entries as locked in accordance with the approval rules stating that all timelogs included in an approved timesheet are no longer editable or removable.
 *
 * This operation is commonly used together with the parent timesheet detail operation. Clients typically fetch the target timesheet first to obtain the week boundary, owner context, and workflow status, then call this endpoint to browse the included timelog rows with pagination, text search, or sorting suited for review screens. Error handling should clearly distinguish between a missing timesheet, a timesheet outside the caller's organization scope, and a visible timesheet that simply has no included timelogs matching the current filter.
 *
 * @param props.connection
 * @param props.timesheetId Target timesheet's ID
 * @param props.body Filtering, sorting, and pagination options for included timelogs
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor employee
 * @x-autobe-specification Implement this operation as a nested list query over `hrm_time_tracking_timesheet_timelogs` joined to `hrm_time_tracking_timelogs` and validated against `hrm_time_tracking_timesheets`.
 *
 * 1. Authorize the caller in the current organization context. Owners and managers may read timesheet contents according to organization-scoped review permissions. Employees may read only their own timesheet contents. Reject access when the target timesheet does not belong to the active organization context or when the caller lacks permission to read that employee's weekly record.
 *
 * 2. Load the parent row from `hrm_time_tracking_timesheets` by `id = timesheetId` and `deleted_at IS NULL`. Confirm the parent belongs to the active organization. If not found, return a not-found error. If found but not accessible to the caller, return a forbidden error.
 *
 * 3. Build the result set by joining `hrm_time_tracking_timesheet_timelogs` to `hrm_time_tracking_timelogs` on the included timelog id. Filter inclusion rows by `hrm_time_tracking_timesheet_id = timesheetId` and ignore inclusion rows with `deleted_at IS NOT NULL`. Also ignore timelog rows with `deleted_at IS NOT NULL` unless platform conventions for historical visibility explicitly require otherwise; if historical soft-deleted timelogs must remain visible once included, preserve them consistently and document that behavior in the DTO mapping layer.
 *
 * 4. Support request-body driven browsing using `IHrmTimeTrackingTimelog.IRequest`. At minimum, allow pagination and deterministic sorting. Search and filter criteria may include `worked_on`, `billable`, `hrm_time_tracking_project_id`, `hrm_time_tracking_task_id`, and partial matching on the timelog `description`, but only if those fields are defined in the request DTO. Do not invent unsupported filters beyond the actual DTO schema.
 *
 * 5. Map each row to `IHrmTimeTrackingTimelog.ISummary` using fields grounded in the timelog schema: identifier, worked date, duration in minutes, description, billable flag, project reference, optional task reference, employee reference, and timestamps as defined by the DTO schema. If the summary includes derived lock information, compute it from the parent timesheet status rather than from a nonexistent timelog lock column.
 *
 * 6. Return `IPageIHrmTimeTrackingTimelog.ISummary` with pagination metadata and the filtered timelog summaries. Preserve stable ordering to avoid duplicate or skipped rows across pages.
 *
 * 7. Important business behavior: this endpoint is read-only. Do not modify inclusion rows, timelog rows, review timestamps, or timesheet status. Approval, rejection, and draft composition changes are handled by separate operations. When the parent timesheet is approved, the operation still returns the included timelogs for review, but callers must not infer editability from this endpoint.
 *
 * 8. Handle edge cases explicitly: a visible timesheet with zero included timelogs returns an empty page; a draft timesheet may legitimately have changing contents as draft composition changes occur; a submitted or approved timesheet should return the included timelogs as of the current persisted composition. Use organization-scoped query predicates throughout to prevent cross-tenant exposure.
 * @path /hrmTimeTracking/employee/timesheets/:timesheetId/timelogs
 * @accessor api.functional.hrmTimeTracking.employee.timesheets.timelogs.index
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
     * Filtering, sorting, and pagination options for included timelogs
     */
    body: IHrmTimeTrackingTimelog.IRequest;
  };
  export type Body = IHrmTimeTrackingTimelog.IRequest;
  export type Response = IPageIHrmTimeTrackingTimelog.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/hrmTimeTracking/employee/timesheets/:timesheetId/timelogs",
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
    `/hrmTimeTracking/employee/timesheets/${encodeURIComponent(props.timesheetId ?? "null")}/timelogs`;
  export const random = (): IPageIHrmTimeTrackingTimelog.ISummary =>
    typia.random<IPageIHrmTimeTrackingTimelog.ISummary>();
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
 * Retrieve a specific timelog that is included in a specific weekly timesheet.
 *
 * This operation provides detailed access to one historical work entry within the context of a weekly timesheet owned by an employee in the current organization. In the underlying data model, the weekly record is stored in `hrm_time_tracking_timesheets` as a Monday-to-Sunday reporting period with workflow state such as draft, submitted, approved, or rejected, while the actual work record is stored separately in `hrm_time_tracking_timelogs` with its organization, employee, project, optional task, worked date, duration in whole minutes, optional work description, and billable classification. The relationship between the two is normalized through `hrm_time_tracking_timesheet_timelogs`, which records explicit inclusion of a timelog in a timesheet rather than embedding the timelog directly in the parent record.
 *
 * From a business perspective, this endpoint is used when a client already has a weekly timesheet context and needs to inspect one included work entry in detail. That is especially important during the submission and review journey, where a timesheet represents the employee's weekly declaration of recorded work, and approvers need to inspect the included timelogs together with the employee, week, and calculated total hours shown elsewhere in the timesheet workflow. When the parent timesheet has already been approved, the included timelog is still retrieved as a historical record, and the approved workflow state means the included timelog remains locked from editing or deletion while it is part of the approved timesheet.
 *
 * Access to this operation is organization-scoped. An employee may use it to inspect a timelog inside a timesheet they own, while users with timesheet approval responsibility in the same organization may use it when reviewing submitted or approved weekly records. The operation must not expose records across organization boundaries, and it must not return a timelog unless it is actually linked to the specified timesheet through an active inclusion row. This preserves the business rule that a timelog may be included in at most one timesheet at a time and ensures the nested route reflects a real parent-child relationship rather than an arbitrary combination of identifiers.
 *
 * This endpoint is commonly used together with the timesheet detail or list operations. A client would typically pre-execute a timesheet listing operation to find the relevant weekly record, then open the parent timesheet, and finally call this endpoint to inspect a specific included timelog. If the parent timesheet is in submitted or approved status, the returned timelog should be interpreted in that review context, including the fact that approved timesheets keep included timelogs locked as historical records.
 *
 * If either identifier does not resolve to an accessible resource, or if the timelog is not linked to the specified timesheet, the operation should fail instead of returning unrelated time data. Records marked as deleted in the underlying timelog or inclusion row must not be exposed as active included work entries through this endpoint.
 *
 * @param props.connection
 * @param props.timesheetId Target timesheet ID
 * @param props.timelogId Target timelog ID included in the specified timesheet
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor employee
 * @x-autobe-specification Load the parent timesheet from `hrm_time_tracking_timesheets` by `id = timesheetId` and ensure it is not logically deleted by checking `deleted_at IS NULL`. Enforce organization-scoped authorization using the current actor context. If the actor is an employee, allow access only when the timesheet belongs to that employee and organization. If the actor is an owner or manager with timesheet approval authority in the same organization, allow access according to organization membership and approval permissions.
 *
 * Load the inclusion row from `hrm_time_tracking_timesheet_timelogs` where `hrm_time_tracking_timesheet_id = timesheetId`, `hrm_time_tracking_timelog_id = timelogId`, and `deleted_at IS NULL`. If no such row exists, return a not-found error for the nested resource, because the target timelog is not included in the specified timesheet.
 *
 * Load the timelog from `hrm_time_tracking_timelogs` by `id = timelogId` and ensure `deleted_at IS NULL`. Validate that the timelog organization matches the parent timesheet organization. For defense in depth, also validate that the timelog employee matches the timesheet owner employee, because the weekly timesheet is the employee's own declaration of work and draft composition is built from that employee's weekly timelogs.
 *
 * Return the detailed timelog DTO populated from the timelog record, including organization-owned historical work data such as `worked_on`, `duration_minutes`, `description`, `billable`, project reference, and optional task reference. Do not mutate any workflow fields. Do not calculate or persist any new aggregate values. If the parent timesheet status is `approved`, still return the timelog normally, but treat it as read-only in downstream layers because approved timesheets keep included timelogs locked from editing and deletion.
 *
 * Handle error cases explicitly: return not found when the timesheet does not exist, the timelog does not exist, or the inclusion relation is absent; return forbidden when the actor is outside the allowed organization-scoped access boundary; and return conflict or forbidden only if downstream authorization rules require stricter protection for reviewers versus self-view. Keep the operation read-only and side-effect free.
 * @path /hrmTimeTracking/employee/timesheets/:timesheetId/timelogs/:timelogId
 * @accessor api.functional.hrmTimeTracking.employee.timesheets.timelogs.at
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
     * Target timesheet ID
     */
    timesheetId: string & tags.Format<"uuid">;

    /**
     * Target timelog ID included in the specified timesheet
     */
    timelogId: string & tags.Format<"uuid">;
  };
  export type Response = IHrmTimeTrackingTimelog;

  export const METADATA = {
    method: "GET",
    path: "/hrmTimeTracking/employee/timesheets/:timesheetId/timelogs/:timelogId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/hrmTimeTracking/employee/timesheets/${encodeURIComponent(props.timesheetId ?? "null")}/timelogs/${encodeURIComponent(props.timelogId ?? "null")}`;
  export const random = (): IHrmTimeTrackingTimelog =>
    typia.random<IHrmTimeTrackingTimelog>();
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
      assert.param("timelogId")(() => typia.assert(props.timelogId));
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
 * Permanently remove a specific timelog that is currently included in a specific weekly timesheet.
 *
 * This operation manages the normalized relationship between weekly timesheets and individual timelog entries. The underlying data model stores weekly timesheet workflow state in `hrm_time_tracking_timesheets` and stores raw work history in `hrm_time_tracking_timelogs`, while inclusion of a timelog in a timesheet is tracked by the separate `hrm_time_tracking_timesheet_timelogs` association table. Because each timelog can belong to at most one timesheet at a time, this endpoint must first confirm that the target `timelogId` is actually attached to the specified `timesheetId` before any removal is attempted.
 *
 * The operation is organization-scoped through the timesheet and timelog records themselves. A timesheet is the weekly record owned by one employee for a Monday-to-Sunday reporting period, with workflow states such as draft, submitted, approved, and rejected. A timelog is the historical work entry that stores the employee, organization, project, optional task, work date, duration in whole minutes, optional description, and billable flag. Removing a timelog through this endpoint therefore affects both the weekly composition of the timesheet and the historical work record represented by that timelog.
 *
 * Access control depends on actor role and time management authority. The owning employee may remove that employee's own timelog only while the record remains editable under the business rules. In particular, the system must reject deletion when the timelog is part of a submitted timesheet or part of an approved timesheet. Users with time management authority, such as authorized owners or managers within the organization context, may delete any employee timelog even when it belongs to another employee. The implementation must always verify that the requester is acting within the same organization context as the target timesheet and timelog.
 *
 * This endpoint depends on prior retrieval workflows in typical client usage. Clients usually obtain the target weekly record through timesheet listing or detail retrieval, then identify included work entries in that context before calling this delete operation with both identifiers. The operation should fail when the timesheet does not exist, the timelog does not exist, the timelog is not included in the specified timesheet, the requester lacks authority, or the timesheet workflow state prevents employee self-service deletion. On success, the system removes the association row from `hrm_time_tracking_timesheet_timelogs` and removes the corresponding `hrm_time_tracking_timelogs` record so that the deleted work entry is no longer available in weekly submission, reporting, dashboard aggregation, or future time tracking use.
 *
 * @param props.connection
 * @param props.timesheetId Target timesheet's ID
 * @param props.timelogId Target timelog's ID
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor employee
 * @x-autobe-specification Implement this operation as a transactional delete of a timelog within the context of a specific timesheet.
 *
 * 1. Load the target timesheet by `timesheetId` from `hrm_time_tracking_timesheets` where `deleted_at IS NULL`.
 * 2. Load the target timelog by `timelogId` from `hrm_time_tracking_timelogs` where `deleted_at IS NULL`.
 * 3. Load the association row from `hrm_time_tracking_timesheet_timelogs` using both `hrm_time_tracking_timesheet_id = timesheetId` and `hrm_time_tracking_timelog_id = timelogId`, excluding rows whose `deleted_at` is not null if logical removal of association rows is used.
 * 4. Validate that all three records exist and that the timesheet and timelog belong to the same organization. Reject the request if the timelog is not currently attached to the specified timesheet.
 * 5. Authorize the requester:
 *    - If the requester is the employee owner of the timelog, allow deletion only when the parent timesheet status is editable for self-service deletion. Based on loaded business rules, reject when the timesheet status is `submitted` or `approved`.
 *    - If the requester has organization time management authority, allow deletion of any employee timelog in the organization.
 *    - Otherwise reject as forbidden.
 * 6. Apply business validation:
 *    - Reject if the timesheet is submitted or approved for employee self-service deletion.
 *    - Reject if record ownership or organization scope does not match the authenticated context.
 *    - Reject if either record has already been deleted.
 * 7. In one database transaction:
 *    - Delete or logically remove the row from `hrm_time_tracking_timesheet_timelogs`.
 *    - Delete or logically remove the row from `hrm_time_tracking_timelogs`.
 * 8. Return the deleted timelog payload using the timelog response DTO so the client can reconcile local state.
 *
 * Implementation notes:
 * - Use the association table as the authoritative source for timesheet inclusion because the timelog model does not hold a direct timesheet foreign key.
 * - Respect the unique constraint on `hrm_time_tracking_timesheet_timelogs.hrm_time_tracking_timelog_id`, which guarantees at most one active parent timesheet per timelog.
 * - If the service uses logical deletion for these tables, set `deleted_at` and exclude deleted rows consistently from future reads.
 * - Preserve standard error semantics for not found, forbidden, and invalid workflow state cases.
 * - Do not recalculate stored totals on the timesheet because the schema explicitly states that totals are derived from linked timelog records rather than stored on the parent table.
 * @path /hrmTimeTracking/employee/timesheets/:timesheetId/timelogs/:timelogId
 * @accessor api.functional.hrmTimeTracking.employee.timesheets.timelogs.erase
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
     * Target timesheet's ID
     */
    timesheetId: string & tags.Format<"uuid">;

    /**
     * Target timelog's ID
     */
    timelogId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/hrmTimeTracking/employee/timesheets/:timesheetId/timelogs/:timelogId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/hrmTimeTracking/employee/timesheets/${encodeURIComponent(props.timesheetId ?? "null")}/timelogs/${encodeURIComponent(props.timelogId ?? "null")}`;
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
      assert.param("timesheetId")(() => typia.assert(props.timesheetId));
      assert.param("timelogId")(() => typia.assert(props.timelogId));
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
