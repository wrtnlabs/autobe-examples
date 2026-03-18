import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IHrmTimeTrackingEmployeeWeeklySummary } from "../../../../structures/IHrmTimeTrackingEmployeeWeeklySummary";
import { IPageIHrmTimeTrackingEmployeeWeeklySummary } from "../../../../structures/IPageIHrmTimeTrackingEmployeeWeeklySummary";

/**
 * Retrieve a filtered and paginated Weekly Summary Report for the current organization.
 *
 * This operation provides the report-viewing workflow described for the Weekly Summary Report, allowing an authorized user to submit a required date range and an optional project filter and receive week-by-week summary results. Each returned week represents a fixed business week and is intended to support comparison across the selected period. In accordance with the report rules, the response includes only the defined aggregate measures for each included week: total hours logged, number of timelogs recorded, and number of employees who logged time.
 *
 * The report is organization-scoped. Access must be evaluated using the caller's permissions in the currently selected organization only, consistent with the organization-scoped access evaluation rules. A permission granted in another organization must not affect access to this operation, and the optional project filter must also be resolved only within the current organization context.
 *
 * The weekly output is derived primarily from historical timelog data recorded within the organization. When a project filter is supplied, the system must limit aggregation to timelogs associated with that selected project before calculating the weekly totals, weekly timelog counts, and weekly employee counts. When no project filter is supplied, the system must summarize all applicable timelog data for the current organization within the requested date range.
 *
 * Week grouping must follow the platform's fixed Monday-to-Sunday weekly boundaries. The resulting summary rows should therefore reflect business weeks rather than arbitrary rolling intervals. If the requested range spans multiple weeks, each included week should be returned as a separate summary item so that users can compare changes over time.
 *
 * This endpoint is commonly used together with report browsing interfaces that allow the user to select the date range first and optionally narrow the result by project. If timelog data changes while a report view is visible, downstream real-time features may mark the displayed report as stale and refresh affected weeks, but this operation itself is the authoritative read interface for obtaining the recalculated week-by-week summary data.
 *
 * If the date range is missing, the request must be rejected. If the supplied project filter references a project outside the current organization or the caller lacks report-viewing permission in the current organization, the operation must also be denied. Error handling must preserve organization isolation and must not expose data from any other organization context.
 *
 * @param props.connection
 * @param props.body Weekly summary report filters and pagination options
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor employee
 * @x-autobe-specification Implement this operation as an organization-scoped analytical query over time-tracking data.
 *
 * 1. Resolve the caller's current organization context from authenticated session state and evaluate whether the caller has report-viewing permission in that organization. Reject the request if permission is absent.
 *
 * 2. Validate the request body. A date range is mandatory. Reject the request when the range is missing or structurally invalid. If a project identifier is provided, verify that the referenced project belongs to the same current organization before using it as a filter.
 *
 * 3. Build the base dataset from hrm_time_tracking_timelogs constrained to the current organization and limited to timelog dates that fall within the requested date range. If a project filter is present, add a predicate restricting timelogs to that project only.
 *
 * 4. Convert each matching timelog date into its business week bucket using Monday as week start and Sunday as week end. Group records by week boundary pair. For each group, calculate exactly these measures and no others: total logged hours, timelog count, and distinct employee count.
 *
 * 5. Order weekly groups according to the request's sorting settings; if no explicit sort is provided, default to chronological ordering by week start date. Apply pagination after aggregation so the response pages through weekly summary rows rather than raw timelog records.
 *
 * 6. Return a paginated response object containing weekly summary items. Each item should include the week boundary information and the three required aggregate measures. Do not include unrelated analytics. Do not create or modify persistent business records as part of this read operation.
 *
 * 7. Error cases: return not found or validation failure for an invalid project reference in the current organization, forbidden for missing report permission, and bad request for missing date range. Preserve strict organization isolation in all queries and failures.
 *
 * 8. Real-time refresh behavior is out of scope for the synchronous query itself, but the aggregation logic here must match the values used when visible weekly summary reports are refreshed after timelog changes.
 * @path /hrmTimeTracking/employee/weeklySummaries
 * @accessor api.functional.hrmTimeTracking.employee.weeklySummaries.index
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
     * Weekly summary report filters and pagination options
     */
    body: IHrmTimeTrackingEmployeeWeeklySummary.IRequest;
  };
  export type Body = IHrmTimeTrackingEmployeeWeeklySummary.IRequest;
  export type Response = IPageIHrmTimeTrackingEmployeeWeeklySummary.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/hrmTimeTracking/employee/weeklySummaries",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/hrmTimeTracking/employee/weeklySummaries";
  export const random =
    (): IPageIHrmTimeTrackingEmployeeWeeklySummary.ISummary =>
      typia.random<IPageIHrmTimeTrackingEmployeeWeeklySummary.ISummary>();
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
 * Retrieve a single employee weekly summary record for the current organization context.
 *
 * This operation returns one derived weekly summary from the hrm_time_tracking_employee_weekly_summaries table. That table is described as a dashboard-oriented weekly aggregate and status snapshot for a Monday-to-Sunday period, storing values such as total time logged, current timesheet state, active timer presence, and assigned task counts. The summary is tied to one employee through hrm_time_tracking_employee_id and is intended for efficient weekly insight retrieval rather than direct workflow mutation.
 *
 * The returned resource reflects a fixed business week. The underlying schema states that week_start_date is aligned to Monday and week_end_date is aligned to Sunday, and the requirements for timesheet and weekly reporting confirm that weekly periods are always bounded by that Monday-to-Sunday structure. Consumers can use this operation when a list, dashboard, or alert surface has already identified a specific weekly summary row and the client needs the full record for inspection.
 *
 * Access to this operation must be evaluated in the currently selected organization only. Organization-scoped permissions apply independently per organization, and permissions from another organization must not grant access here. Owners and managers may use this endpoint when they have report or dashboard visibility in the current organization. Employees may only access a record that belongs to their own employee relationship when such access is allowed by current organization permissions and ownership boundaries.
 *
 * This operation reads from a derived insights table rather than recalculating weekly aggregates on demand. The record may be refreshed when underlying timelog data changes within the represented range, consistent with the requirement that visible weekly summaries become stale and are refreshed after relevant timelog changes. Clients that need to discover candidate records before calling this detail endpoint should first use the corresponding weekly summary list or dashboard retrieval API, then supply the selected employeeWeeklySummaryId to obtain the exact summary row.
 *
 * If the identifier does not match a summary record visible in the current organization context, the request must be rejected. If the caller lacks permission in the current organization, the request must also be denied. The operation returns only the persisted weekly measures supported by the summary model, including total minutes logged, current timesheet status, active timer state, assigned open task count, assigned in-progress task count, and the stored week boundary fields.
 *
 * @param props.connection
 * @param props.employeeWeeklySummaryId Target employee weekly summary record ID
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor employee
 * @x-autobe-specification Load a single row from hrm_time_tracking_employee_weekly_summaries by id.
 *
 * Validate that employeeWeeklySummaryId is a UUID-form identifier and query the summary table for a non-deleted record whose id matches the supplied value. Join or follow the employee relation through hrm_time_tracking_employee_id to validate that the summary belongs to an employee accessible within the caller's current organization context. Do not permit cross-organization access based on roles from another organization.
 *
 * Authorize by current organization context before returning data. Owners may access summaries in their organization. Managers may access summaries only when their organization-scoped permissions allow report or workforce insight viewing. Employees may access only their own summary record when the current organization context maps them to the owning employee and the product's permission model allows personal dashboard or weekly insight viewing.
 *
 * Return the persisted derived record as IHrmTimeTrackingEmployeeWeeklySummary without recalculating totals during normal reads. The response should expose the stored summary fields, including week_start_date, week_end_date, total_minutes_logged, current_timesheet_status, active_timer_running, assigned_open_task_count, assigned_in_progress_task_count, created_at, and updated_at. Exclude deleted records by honoring deleted_at as retired lifecycle data.
 *
 * When no matching accessible record exists, return a not-found outcome. When the caller is authenticated but lacks permission in the current organization, return a forbidden outcome. If the record exists but is outside the caller's organization boundary through the related employee context, do not leak existence details beyond the normal authorization policy. Keep the read operation side-effect free.
 * @path /hrmTimeTracking/employee/weeklySummaries/:employeeWeeklySummaryId
 * @accessor api.functional.hrmTimeTracking.employee.weeklySummaries.at
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
     * Target employee weekly summary record ID
     */
    employeeWeeklySummaryId: string & tags.Format<"uuid">;
  };
  export type Response = IHrmTimeTrackingEmployeeWeeklySummary;

  export const METADATA = {
    method: "GET",
    path: "/hrmTimeTracking/employee/weeklySummaries/:employeeWeeklySummaryId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/hrmTimeTracking/employee/weeklySummaries/${encodeURIComponent(props.employeeWeeklySummaryId ?? "null")}`;
  export const random = (): IHrmTimeTrackingEmployeeWeeklySummary =>
    typia.random<IHrmTimeTrackingEmployeeWeeklySummary>();
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
      assert.param("employeeWeeklySummaryId")(() =>
        typia.assert(props.employeeWeeklySummaryId),
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
