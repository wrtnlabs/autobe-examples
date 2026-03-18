import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IHrmTimeTrackingReport } from "../../../../structures/IHrmTimeTrackingReport";
import { IHrmTimeTrackingReportEmployeeFilter } from "../../../../structures/IHrmTimeTrackingReportEmployeeFilter";

/**
 * Create a new employee filter selection for an existing saved report definition.
 *
 * This operation adds exactly one normalized employee selection to the filter criteria of a saved report in the current organization context. The parent report is a reusable analytical definition stored in the reports table, which preserves stable configuration such as report type, optional reporting period, grouping mode, and billable filtering flags. Instead of storing employee selections as an embedded array on the report record, the platform persists each selected employee as an individual child row in the report employee filters table so the definition remains normalized and reusable over time.
 *
 * Access to this operation is organization-scoped and must follow report access rules for the currently selected organization. The caller must have report viewing permission in that organization before report filters are exposed or modified. A role granted in another organization must not affect access to this request. The target report must belong to the current organization, and the selected employee must also belong to that same organization. If either resource is outside the active organization boundary, the request must be rejected without exposing cross-organization data.
 *
 * This operation works with the saved report definition resource represented by hrm_time_tracking_reports and the normalized child resource represented by hrm_time_tracking_report_employee_filters. The report record is described as a saved organization-scoped report definition for reusable analytical views, while the child filter table records exactly one employee included in the report criteria. The created row links the report's primary key to the selected employee's primary key and enforces uniqueness so the same employee cannot be added twice to the same report.
 *
 * Clients will typically call a report detail retrieval operation before using this endpoint so they can inspect the target report definition and its current filter configuration. They will also typically use an organization-scoped employee browsing operation to choose a valid employee from the current organization. This endpoint should then be used to persist that selection as part of the saved report definition. Validation errors are expected when the report does not exist, the employee does not exist in the same organization, the caller lacks report access, or the same employee has already been attached to the same report.
 *
 * @param props.connection
 * @param props.reportId Target saved report definition's ID
 * @param props.body Employee filter selection to add to the saved report
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Authorize the caller against the currently selected organization context before any data lookup that would expose report configuration. Require report viewing permission in the active organization, because report access validation must occur before showing or modifying report filters.
 *
 * Load the parent hrm_time_tracking_reports row by id = reportId and deleted_at IS NULL. Reject the request if the report does not exist or if its hrm_time_tracking_organization_id does not match the caller's current organization context.
 *
 * Validate the request body against IHrmTimeTrackingReportEmployeeFilter.ICreate. Extract the target employee identifier from the body and load the corresponding organization employee row. Reject the request if the employee does not exist or if the employee does not belong to the same organization as the parent report.
 *
 * Before insertion, check the unique pair constraint on [hrm_time_tracking_report_id, hrm_time_tracking_employee_id]. If a row already exists for the same report and employee combination, reject the request as a duplicate filter selection.
 *
 * Insert a new hrm_time_tracking_report_employee_filters row with a generated UUID primary key, the resolved report id, and the resolved employee id. Execute the uniqueness check and insert in a transaction or rely on the database unique constraint with conflict handling so concurrent duplicate submissions are handled safely.
 *
 * Return the created filter resource as IHrmTimeTrackingReportEmployeeFilter. The implementation may include joined parent or employee summary data only if the DTO definition supports it, but it must at minimum return the persisted child resource fields. Do not allow creation against deleted reports, and do not permit references to employees outside the parent report's organization.
 * @path /hrmTimeTracking/reports/:reportId/employeeFilters
 * @accessor api.functional.hrmTimeTracking.reports.employeeFilters.create
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
     * Target saved report definition's ID
     */
    reportId: string & tags.Format<"uuid">;

    /**
     * Employee filter selection to add to the saved report
     */
    body: IHrmTimeTrackingReportEmployeeFilter.ICreate;
  };
  export type Body = IHrmTimeTrackingReportEmployeeFilter.ICreate;
  export type Response = IHrmTimeTrackingReportEmployeeFilter;

  export const METADATA = {
    method: "POST",
    path: "/hrmTimeTracking/reports/:reportId/employeeFilters",
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
    `/hrmTimeTracking/reports/${encodeURIComponent(props.reportId ?? "null")}/employeeFilters`;
  export const random = (): IHrmTimeTrackingReportEmployeeFilter =>
    typia.random<IHrmTimeTrackingReportEmployeeFilter>();
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
 * Update the selected employee filters for a saved report definition.
 *
 * This operation modifies the normalized employee-filter selection set attached to one saved report definition in the current organization context. The parent record is the `hrm_time_tracking_reports` entity, which stores a reusable analytical view including the report name, report type, optional reporting range, grouping mode, and billable filter toggles. The nested `hrm_time_tracking_report_employee_filters` records represent the employee portion of that saved configuration as one row per selected employee instead of a serialized array payload. This keeps the report definition reusable and structurally consistent over time.
 *
 * Access to this operation is organization-scoped and must be validated before the system reveals or changes any filter state. According to the reporting requirements, only users who have report viewing permission in the currently selected organization may access reporting functions, filters, and results. A user’s permissions from any other organization must have no effect here. If the caller lacks report viewing permission in the active organization, the system must deny the request and must not expose whether the target report exists outside that authorized scope.
 *
 * The employee filters managed by this endpoint correspond to report-analysis behavior described for the Time Report, where users may narrow results to selected employees while keeping the report limited to the current organization’s employees, projects, tasks, timelogs, and timesheets. When this operation updates the employee filter set, every referenced employee must belong to the same organization as the parent saved report. The uniqueness rule on the child table ensures that the same employee cannot be attached more than once to the same report definition, and the implementation must preserve that invariant when replacing or reconciling filter rows.
 *
 * This endpoint updates saved configuration only; it does not execute the report and does not return calculated totals by itself. API consumers typically use this operation together with report retrieval or report execution flows: first obtain the target saved report definition, then update employee selections here, then request the refreshed report view or generated analytical output using the updated configuration. If the specified report is deleted, outside the caller’s authorized organization, or references employees outside the same organization boundary, the request must fail clearly without creating partial filter records.
 *
 * @param props.connection
 * @param props.reportId Target saved report definition ID
 * @param props.body Employee filter selection update payload
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Implement this operation as an organization-scoped partial update on the employee-filter collection of one saved report definition.
 *
 * 1. Authenticate the caller and resolve the currently selected organization context.
 * 2. Evaluate report viewing permission in that organization before loading filter data, as report access validation must happen before filters or report results are shown or changed.
 * 3. Load `hrm_time_tracking_reports` by `id = reportId`, `hrm_time_tracking_organization_id = currentOrganizationId`, and `deleted_at IS NULL`. If not found, return a not-found error within the authorized scope.
 * 4. Validate the request payload. The payload should contain the intended employee selection set for the report. Reject duplicate employee identifiers in the payload before writing to the database.
 * 5. If the payload contains employee identifiers, verify that every referenced employee exists in `hrm_time_tracking_employees` and belongs to the same organization as the parent report. Reject any identifier that is missing, inaccessible, or belongs to another organization.
 * 6. Apply the update transactionally. The recommended behavior is full replacement of the normalized filter set for this report: delete existing rows from `hrm_time_tracking_report_employee_filters` for the target report, then insert one row per validated employee identifier. This approach aligns with the child table’s role as a normalized representation of one parent-owned configuration field.
 * 7. Update `hrm_time_tracking_reports.updated_at` to the current timestamp as part of the same transaction.
 * 8. Return the refreshed saved report definition, including its employee filter associations if the response DTO supports them.
 *
 * Implementation notes:
 * - Respect the unique constraint on `[hrm_time_tracking_report_id, hrm_time_tracking_employee_id]`; do not rely on database errors for ordinary duplicate handling.
 * - Do not create partial child rows when any employee identifier is invalid.
 * - Do not allow this operation to modify report ownership, report type, date range, grouping, or non-employee filter categories.
 * - If the report type does not support employee filtering by business rule, reject the update as invalid instead of silently storing irrelevant filters.
 * - Because the child model is subsidiary and parent-managed, do not expose independent child-row lifecycle semantics such as separate creation or deletion flows through this endpoint.
 * - Keep all reads and writes isolated to the currently selected organization context.
 * @path /hrmTimeTracking/reports/:reportId/employeeFilters
 * @accessor api.functional.hrmTimeTracking.reports.employeeFilters.patchByReportid
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function patchByReportid(
  connection: IConnection,
  props: patchByReportid.Props,
): Promise<patchByReportid.Response> {
  return true === connection.simulate
    ? patchByReportid.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...patchByReportid.METADATA,
          path: patchByReportid.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace patchByReportid {
  export type Props = {
    /**
     * Target saved report definition ID
     */
    reportId: string & tags.Format<"uuid">;

    /**
     * Employee filter selection update payload
     */
    body: IHrmTimeTrackingReport.IUpdateEmployeeFilter;
  };
  export type Body = IHrmTimeTrackingReport.IUpdateEmployeeFilter;
  export type Response = IHrmTimeTrackingReport;

  export const METADATA = {
    method: "PATCH",
    path: "/hrmTimeTracking/reports/:reportId/employeeFilters",
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
    `/hrmTimeTracking/reports/${encodeURIComponent(props.reportId ?? "null")}/employeeFilters`;
  export const random = (): IHrmTimeTrackingReport =>
    typia.random<IHrmTimeTrackingReport>();
  export const simulate = (
    connection: IConnection,
    props: patchByReportid.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: patchByReportid.path(props),
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
 * Retrieve one employee filter entry from a saved report definition.
 *
 * This operation returns a single normalized employee filter row that is attached to a saved report in the current organization context. In the database, the underlying record is stored in `hrm_time_tracking_report_employee_filters`, which exists specifically to record exactly one selected employee included in the filter criteria of a parent `hrm_time_tracking_reports` record. The parent report stores stable analytical configuration such as report family, optional reporting range, grouping mode, and billable toggles, while repeating employee selections are normalized into this child table so the report definition remains reusable and structurally consistent over time.
 *
 * Access to this endpoint is organization-scoped and permission-gated. The caller must have report viewing permission for the currently selected organization before any report filters or results are exposed. The system must evaluate that permission only within the active organization context, and access in another organization must not influence this request. If the caller does not have report viewing permission, the system must deny access and must not reveal whether the requested report or employee filter exists in another organization.
 *
 * This endpoint is dependent on the parent report context represented by `{reportId}`. The employee filter entry is not an independently administered business object; it is managed through its parent saved report definition. Implementations should therefore first resolve the parent report, confirm that it belongs to the currently selected organization, and then resolve the child employee filter by `{employeeFilterId}` under that report. This prevents cross-report or cross-organization record exposure and keeps the behavior aligned with the schema comment that this table is managed through its parent report.
 *
 * The returned resource should represent the selected employee filter entry itself, including its identity and parent-child linkage, rather than full report output data. This operation is useful when a client needs to inspect a specific saved employee selection within a report editing or report detail workflow. Related operations typically include first retrieving or selecting the parent report from the organization's report area and then requesting specific nested filter records when rendering detailed saved configuration screens.
 *
 * If either the parent report does not exist in the current organization, the child filter does not belong to that report, or the caller lacks report access, the operation must fail without exposing unrelated organization data. The endpoint must return only information derived from the selected organization's report ownership boundary, consistent with the platform's organization-centered visibility and report access validation rules.
 *
 * @param props.connection
 * @param props.reportId Target saved report definition ID
 * @param props.employeeFilterId Target employee filter entry ID under the specified report
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Implement a read-only service operation that fetches one employee filter selection belonging to one saved report definition.
 *
 * 1. Authorize the caller by checking report viewing permission in the currently selected organization context before loading filter details. Reuse the same report-access rule applied to report area access: only users with report viewing permission in the active organization may proceed.
 *
 * 2. Load the parent row from `hrm_time_tracking_reports` by `id = reportId` and `deleted_at IS NULL`. Verify that `hrm_time_tracking_organization_id` matches the caller's currently selected organization. If not found, deleted, or outside the current organization, reject the request as not found or forbidden according to the service's standard access-hiding policy.
 *
 * 3. Load the child row from `hrm_time_tracking_report_employee_filters` by `id = employeeFilterId` and `hrm_time_tracking_report_id = reportId`. Do not query the child only by its id without the parent constraint. This guarantees that the nested resource truly belongs to the addressed report.
 *
 * 4. Map the result to `IHrmTimeTrackingReportEmployeeFilter`. Include the child identifier, the parent report identifier, and the selected employee identifier from the actual row. Do not synthesize unrelated fields that are not present in the schema.
 *
 * 5. Return the mapped DTO as JSON. No mutation, transaction, or side effects are required.
 *
 * Validation and error handling:
 * - Reject when report viewing permission is absent in the current organization.
 * - Reject when the parent report is missing, belongs to another organization, or has been deleted.
 * - Reject when the employee filter row is missing or does not belong to the specified report.
 * - Do not reveal data from another organization or from another report through different error wording.
 *
 * Performance notes:
 * - Use indexed lookups on `hrm_time_tracking_reports.id` and `hrm_time_tracking_report_employee_filters.id`.
 * - Keep the child lookup constrained by both `employeeFilterId` and `reportId` to preserve nested-resource integrity.
 * - No pagination or search logic is needed because this is a single-record detail read.
 * @path /hrmTimeTracking/reports/:reportId/employeeFilters/:employeeFilterId
 * @accessor api.functional.hrmTimeTracking.reports.employeeFilters.at
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
     * Target saved report definition ID
     */
    reportId: string & tags.Format<"uuid">;

    /**
     * Target employee filter entry ID under the specified report
     */
    employeeFilterId: string & tags.Format<"uuid">;
  };
  export type Response = IHrmTimeTrackingReportEmployeeFilter;

  export const METADATA = {
    method: "GET",
    path: "/hrmTimeTracking/reports/:reportId/employeeFilters/:employeeFilterId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/hrmTimeTracking/reports/${encodeURIComponent(props.reportId ?? "null")}/employeeFilters/${encodeURIComponent(props.employeeFilterId ?? "null")}`;
  export const random = (): IHrmTimeTrackingReportEmployeeFilter =>
    typia.random<IHrmTimeTrackingReportEmployeeFilter>();
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
      assert.param("employeeFilterId")(() =>
        typia.assert(props.employeeFilterId),
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

/**
 * Update a single employee selection within a saved report definition.
 *
 * This operation replaces the employee reference stored in one `hrm_time_tracking_report_employee_filters` record that belongs to the specified saved report. The parent `hrm_time_tracking_reports` entity represents a reusable organization-scoped analytical view that stores stable report configuration such as report family, optional reporting period boundaries, grouping mode, and billable filtering flags. The child employee-filter table exists specifically to normalize repeating employee selections so that a saved report can target chosen employees without storing serialized arrays in the parent record.
 *
 * Access to this operation is organization-scoped. The caller must be authorized in the currently selected organization, and the system must evaluate permissions only from the caller's role assignment in that organization context. A caller who is not allowed to access reports in the selected organization must not be allowed to update this employee filter, and a caller must never be able to use a report, role, or employee reference from another organization to affect the current request.
 *
 * From a data perspective, the operation works across the saved report definition and the selected employee reference linked to it. The target report must belong to the currently selected organization, the target `employeeFilterId` must belong to that report, and the replacement employee referenced in the request body must also belong to the same organization workforce. This preserves the normalized structure described by the database schema, where each child row records exactly one selected employee for a report definition and the pair of report and employee is unique.
 *
 * Clients typically use this endpoint after first loading the parent report and its configured filters from report-detail or report-list operations. Updating an employee filter is useful when refining a saved Time Report, Project Budget Report, or Weekly Summary Report without recreating the whole report definition. If the parent report does not exist in the current organization, if the child filter does not belong to that parent, or if the replacement employee is outside the report's organization, the request must be rejected.
 *
 * The operation updates the target filter record only. It does not alter unrelated report settings such as report type, date range, grouping, billable-only flags, or other employee filter rows attached to the same report. The response returns the updated child resource in JSON so clients can immediately refresh the saved-report configuration state shown in the reporting interface.
 *
 * @param props.connection
 * @param props.reportId Target saved report definition ID
 * @param props.employeeFilterId Target employee filter row ID within the saved report
 * @param props.body Replacement employee selection for the saved report filter
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification 1. Authorize the caller in the currently selected organization context before any data lookup is exposed. Require report access for the selected organization and reject the request when the caller lacks permission to work with organization reports.
 * 2. Load the parent record from `hrm_time_tracking_reports` by `reportId` and constrain the query by the current organization identifier and `deleted_at IS NULL`. If no active report is found in the current organization, return a not-found or access-denied outcome without exposing records from another organization.
 * 3. Load the target child record from `hrm_time_tracking_report_employee_filters` by `employeeFilterId` and `hrm_time_tracking_report_id = reportId`. Reject the request if the child record does not belong to the specified parent report.
 * 4. Validate the request body. The replacement employee identifier is required. Resolve the referenced employee in the same organization as the parent report. Reject the request if the employee does not exist, is inaccessible in the current organization, or belongs to another organization.
 * 5. Enforce the table-level uniqueness rule on `(hrm_time_tracking_report_id, hrm_time_tracking_employee_id)`. Before updating, check whether another child row for the same report already references the requested employee. If such a row exists and it is not the current `employeeFilterId`, reject the request as a duplicate filter selection.
 * 6. Update only the target `hrm_time_tracking_report_employee_filters` row so that its `hrm_time_tracking_employee_id` points to the validated replacement employee. Do not modify the parent report row or any sibling filter rows.
 * 7. Return the updated employee-filter resource. If the implementation exposes related data in the DTO, load only relations that are safe and useful for the reporting UI, and keep all returned data scoped to the current organization.
 * 8. Handle errors deterministically: reject malformed UUID inputs, reject unauthorized access before revealing report configuration details, reject parent-child mismatches, reject cross-organization references, and surface uniqueness violations as a business validation failure rather than a partial success.
 * @path /hrmTimeTracking/reports/:reportId/employeeFilters/:employeeFilterId
 * @accessor api.functional.hrmTimeTracking.reports.employeeFilters.putByReportidAndEmployeefilterid
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function putByReportidAndEmployeefilterid(
  connection: IConnection,
  props: putByReportidAndEmployeefilterid.Props,
): Promise<putByReportidAndEmployeefilterid.Response> {
  return true === connection.simulate
    ? putByReportidAndEmployeefilterid.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...putByReportidAndEmployeefilterid.METADATA,
          path: putByReportidAndEmployeefilterid.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace putByReportidAndEmployeefilterid {
  export type Props = {
    /**
     * Target saved report definition ID
     */
    reportId: string & tags.Format<"uuid">;

    /**
     * Target employee filter row ID within the saved report
     */
    employeeFilterId: string & tags.Format<"uuid">;

    /**
     * Replacement employee selection for the saved report filter
     */
    body: IHrmTimeTrackingReportEmployeeFilter.IUpdate;
  };
  export type Body = IHrmTimeTrackingReportEmployeeFilter.IUpdate;
  export type Response = IHrmTimeTrackingReportEmployeeFilter;

  export const METADATA = {
    method: "PUT",
    path: "/hrmTimeTracking/reports/:reportId/employeeFilters/:employeeFilterId",
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
    `/hrmTimeTracking/reports/${encodeURIComponent(props.reportId ?? "null")}/employeeFilters/${encodeURIComponent(props.employeeFilterId ?? "null")}`;
  export const random = (): IHrmTimeTrackingReportEmployeeFilter =>
    typia.random<IHrmTimeTrackingReportEmployeeFilter>();
  export const simulate = (
    connection: IConnection,
    props: putByReportidAndEmployeefilterid.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: putByReportidAndEmployeefilterid.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("reportId")(() => typia.assert(props.reportId));
      assert.param("employeeFilterId")(() =>
        typia.assert(props.employeeFilterId),
      );
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
 * Permanently remove one employee filter selection from a saved report definition.
 *
 * This operation removes a single normalized employee-filter row from the saved report definition identified by reportId. The parent report is the reusable, organization-scoped analytical view stored in hrm_time_tracking_reports, which keeps stable configuration such as the report name, report_type, optional reporting date range, grouping mode, and billable filter flags. The child resource in hrm_time_tracking_report_employee_filters exists specifically to record exactly one selected employee attached to that report so that employee targeting remains normalized instead of being stored as an array or serialized payload. Deleting this child resource updates the report's filter set without deleting the report itself.
 *
 * Access to this operation must be evaluated in the currently selected organization context. Only callers whose current organization role grants report-management capability should be allowed to remove filter selections from a saved report. The operation must not accept permissions derived from another organization, and it must reject attempts to operate on a report that is outside the caller's current tenant scope. If the referenced report has already been marked deleted through its deleted_at lifecycle field, the request must be rejected because filter rows must not be mutated under a deleted parent definition.
 *
 * The operation is tightly coupled to the report hierarchy. The employee filter row is not an independently administered business object; it is managed through its parent hrm_time_tracking_reports record and references a selected hrm_time_tracking_employees row. For that reason, the implementation must verify both that the report exists and that the employeeFilterId row belongs to that exact report before removal. This prevents cross-report or cross-organization deletion attempts that rely only on a child identifier.
 *
 * Clients typically use this endpoint together with report detail and report update flows. A caller would first retrieve or otherwise know the saved report definition and its current employee filter selections, then invoke this endpoint to remove one selection, and finally reload the report detail or list view to reflect the revised targeting. The deletion only affects the saved filter configuration; it does not remove employees, reports, or historical report outputs. Errors should clearly distinguish between missing report, missing child filter, parent-child mismatch, deleted parent report, and insufficient permission in the current organization context.
 *
 * @param props.connection
 * @param props.reportId Target saved report definition ID.
 * @param props.employeeFilterId Target employee filter selection ID within the specified report.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification 1. Resolve the caller's current organization context and verify the caller has permission to manage saved reports in that organization. Reject the request if the caller lacks organization-scoped authority.
 * 2. Load hrm_time_tracking_reports by id = reportId and hrm_time_tracking_organization_id = currentOrganizationId. Exclude reports whose deleted_at is not null. If no row is found, return a not-found or inaccessible error for the parent report.
 * 3. Load hrm_time_tracking_report_employee_filters by id = employeeFilterId and hrm_time_tracking_report_id = reportId. If no row is found, return a not-found error for the nested employee filter resource. Do not delete by child id alone.
 * 4. Delete the matched hrm_time_tracking_report_employee_filters row in a transactionally safe manner. Because the table is a normalized child selection table with no additional mutable business fields, no request payload processing is required.
 * 5. Update the parent report's updated_at timestamp so downstream consumers can detect that the saved report definition changed.
 * 6. Return success with no response body.
 *
 * Validation and edge handling:
 * - Reject requests when the parent report belongs to another organization, even if the child row exists.
 * - Reject requests when the parent report has been deleted via deleted_at.
 * - Reject requests when employeeFilterId does not belong to reportId.
 * - The uniqueness constraint on [hrm_time_tracking_report_id, hrm_time_tracking_employee_id] is relevant for creation, but for deletion it guarantees the row represents exactly one selected employee for the report.
 * - This operation only mutates saved report configuration. It must not delete employees, report snapshots, or the report definition itself.
 * @path /hrmTimeTracking/reports/:reportId/employeeFilters/:employeeFilterId
 * @accessor api.functional.hrmTimeTracking.reports.employeeFilters.erase
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
     * Target saved report definition ID.
     */
    reportId: string & tags.Format<"uuid">;

    /**
     * Target employee filter selection ID within the specified report.
     */
    employeeFilterId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/hrmTimeTracking/reports/:reportId/employeeFilters/:employeeFilterId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/hrmTimeTracking/reports/${encodeURIComponent(props.reportId ?? "null")}/employeeFilters/${encodeURIComponent(props.employeeFilterId ?? "null")}`;
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
      assert.param("employeeFilterId")(() =>
        typia.assert(props.employeeFilterId),
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
