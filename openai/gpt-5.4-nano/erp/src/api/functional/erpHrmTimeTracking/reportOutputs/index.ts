import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IErpHrmTimeTrackingReportOutput } from "../../../structures/IErpHrmTimeTrackingReportOutput";

export * as metrics from "./metrics/index";

/**
 * Retrieve a single generated time-tracking report output row by its identifier.
 *
 * This endpoint provides the detailed, grouped result data produced for a specific report generation run. The returned record is backed by the `erp_hrm_time_tracking_report_outputs` model, where each row represents one grouping (for example, per employee/project/task, and optionally per week bucket depending on the report definition). The operation also exposes the associated per-output metric breakdown that is stored in `erp_hrm_time_tracking_report_output_metrics`, allowing clients to display multiple numeric measures for the same grouped output.
 *
 * Access to report data must respect the organization context and the report viewing permission flow described in the requirements. If an organization context is not selected, report operations must be blocked with a business validation message indicating that an organization must be selected. When an organization context is present, the operation must scope all lookups to that organization, ensuring the requested report output belongs to the selected tenant through its associated `erp_hrm_time_tracking_report_generation_runs.reportDefinition` -> `erp_hrm_time_tracking_report_definitions.erp_hrm_time_tracking_organization_id`.
 *
 * Validation and error handling: if the specified `reportOutputId` does not exist for the selected organization, the system must reject the request with a clear, human-readable explanation (without leaking sensitive organization data). If the referenced report output exists but contains no metric breakdown rows, the system must still return the report output row successfully; the metric list can be empty, reflecting the normalized storage in `erp_hrm_time_tracking_report_output_metrics`.
 *
 * Related behavior: report generation itself follows the defined report viewing flow (permission check, date range and filters validation, and generation). This operation is read-only and must not create or modify any report generation runs or outputs. Clients that need an overview of many outputs should use the corresponding report viewing/list endpoints defined for report generation results, and then call this endpoint for a specific output identifier when detailed metrics are required.
 *
 * Security considerations: the endpoint must enforce organization-scoped authorization for report viewing, consistent with the business requirement that all report generation inputs and outputs are scoped to the selected organization only.
 *
 * @param props.connection
 * @param props.reportOutputId Identifier of the generated report output row to retrieve.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification 1) Parse `reportOutputId` as UUID. 2) Resolve the
 *   `erp_hrm_time_tracking_report_outputs` row by primary key `id =
 *   reportOutputId`. 3) Enforce organization context scoping: - Join
 *   `erp_hrm_time_tracking_report_outputs` ->
 *   `erp_hrm_time_tracking_report_generation_runs` via
 *   `report_generation_run_id`. - Join
 *   `erp_hrm_time_tracking_report_generation_runs` ->
 *   `erp_hrm_time_tracking_report_definitions` via
 *   `erp_hrm_time_tracking_report_definition_id`. - Verify
 *   `erp_hrm_time_tracking_report_definitions.erp_hrm_time_tracking_organization_id`
 *   matches the currently selected organization context. - Also verify the
 *   caller has `report:view` permission for the selected organization (per
 *   report viewing flow). 4) If not found under the selected organization,
 *   reject with business validation error (no partial results). 5) Fetch metric
 *   breakdown rows from `erp_hrm_time_tracking_report_output_metrics` where
 *   `report_output_output_id = reportOutputId`. - Include only rows where
 *   `deleted_at` is null (treat rows with `deleted_at` as removed). - Return
 *   metric_name and metric_value along with any required metadata fields
 *   defined by the response DTO. 6) Fetch/attach foreign key referenced
 *   grouping entities as required by the response DTO: - `employee_id`,
 *   `project_id`, optional `task_id`, optional `week_start_date_id`. - Note: if
 *   the DTO includes expanded related objects, load them via relations;
 *   otherwise only return ids and grouping keys. 7) Return a single
 *   `I...ReportOutput` DTO.
 *
 * Edge cases:
 * - Output exists but has zero metric rows: still return the output row with an empty metrics array.
 * - Organization context missing: block with the business message requiring organization context before accessing reports.
 * @path /erpHrmTimeTracking/reportOutputs/:reportOutputId
 * @accessor api.functional.erpHrmTimeTracking.reportOutputs.at
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
     * Identifier of the generated report output row to retrieve.
     */
    reportOutputId: string & tags.Format<"uuid">;
  };
  export type Response = IErpHrmTimeTrackingReportOutput;

  export const METADATA = {
    method: "GET",
    path: "/erpHrmTimeTracking/reportOutputs/:reportOutputId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/erpHrmTimeTracking/reportOutputs/${encodeURIComponent(props.reportOutputId ?? "null")}`;
  export const random = (): IErpHrmTimeTrackingReportOutput =>
    typia.random<IErpHrmTimeTrackingReportOutput>();
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
      assert.param("reportOutputId")(() => typia.assert(props.reportOutputId));
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
 * Update a specific generated report output row by its identifier.
 *
 * This operation targets a single row in the `erp_hrm_time_tracking_report_outputs` table, which represents one grouped result produced by a report generation run (`report_generation_run_id`). The row groups the result by `employee_id`, `project_id`, optional `task_id`, and optional `week_start_date_id`, and stores a stable `grouping_sort_key` used for deterministic ordering and deduplication across generators. The table also contains an optional human-authored `notes` field and timestamps (`created_at`, `updated_at`) managed by the system.
 *
 * Authorization and organization context: report-related operations require an active organization context. If the caller has not selected an organization context, the system must block the request. When organization context exists, the update is scoped to that organization only.
 *
 * Editable fields and validation: updates are applied only for fields provided by the request DTO `IErpHrmTimeTrackingReportOutput.IUpdate` (for example, `notes` if it is included in the DTO). Requests that attempt to change grouping-defining identity attributes (such as `employee_id`, `project_id`, `task_id`, `week_start_date_id`, or `grouping_sort_key`) must be rejected as invalid.
 *
 * Relationship handling: this operation updates only the parent output row. It must not implicitly create, remove, or directly modify `erp_hrm_time_tracking_report_output_metrics` rows.
 *
 * Expected behavior: if the report output does not exist in the caller’s organization scope, the operation returns a not-found/authorization-style error. On validation failures, no database changes must be applied. The updated entity is returned on success.
 *
 * Related operations: clients typically navigate from report generation runs to their outputs using the corresponding report-run listing/retrieval operations, and use dedicated report output retrieval/invert operations (not covered here) to view full output content including metrics.
 *
 * @param props.connection
 * @param props.reportOutputId Target report output row identifier.
 * @param props.body Updated fields for the generated report output row. Only the writable fields defined by IErpHrmTimeTrackingReportOutput.IUpdate are accepted; grouping identity fields are rejected.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Implementation steps for Realize Agent:
 *
 * 1) Parse inputs:
 * - Read `reportOutputId` from path.
 * - Validate request body against `IErpHrmTimeTrackingReportOutput.IUpdate`.
 *
 * 2) Scope and authorization:
 * - Resolve the report output row by `erp_hrm_time_tracking_report_outputs.id = reportOutputId`.
 * - Join to `erp_hrm_time_tracking_report_generation_runs` via `report_generation_run_id`.
 * - Join to `erp_hrm_time_tracking_report_definitions` via `erp_hrm_time_tracking_report_definition_id`.
 * - Join to `erp_hrm_time_tracking_organizations` via `erp_hrm_time_tracking_report_definitions.erp_hrm_time_tracking_organization_id`.
 * - Verify that the resolved organization matches the caller’s active organization context.
 * - Enforce that the caller has sufficient report permission to update report outputs (exact permission key depends on the system’s role-permission mapping; ensure at minimum that report operations are not accessible without organization context).
 *
 * 3) Editability rules:
 * - Only apply updates to editable fields exposed by the update DTO.
 * - Do not change grouping-defining columns (`employee_id`, `project_id`, `task_id`, `week_start_date_id`, `grouping_sort_key`) unless the update DTO explicitly includes them and requirements confirm it is allowed. Otherwise, reject the request with a business validation error.
 * - Allow `notes` updates if `notes` is part of the update DTO.
 *
 * 4) Transaction:
 * - Perform the update in a single transaction.
 * - Update `updated_at` automatically by the ORM/database if available.
 *
 * 5) Children metrics:
 * - Do not modify `erp_hrm_time_tracking_report_output_metrics` in this operation.
 *
 * 6) Error handling:
 * - If no row is found within the organization scope, throw not-found/forbidden-equivalent error.
 * - If validation fails (e.g., attempt to update non-editable fields), reject without writing any partial update.
 * - On unexpected errors, rollback transaction and return an error response.
 *
 * 7) Activity logging:
 * - If the system records activity log entries, only record an entry after the update transaction commits successfully. Do not record misleading successful logs for rejected updates.
 *
 * Return the updated report output entity.
 * @path /erpHrmTimeTracking/reportOutputs/:reportOutputId
 * @accessor api.functional.erpHrmTimeTracking.reportOutputs.update
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function update(
  connection: IConnection,
  props: update.Props,
): Promise<update.Response> {
  return true === connection.simulate
    ? update.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...update.METADATA,
          path: update.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace update {
  export type Props = {
    /**
     * Target report output row identifier.
     */
    reportOutputId: string & tags.Format<"uuid">;

    /**
     * Updated fields for the generated report output row. Only the writable fields defined by IErpHrmTimeTrackingReportOutput.IUpdate are accepted; grouping identity fields are rejected.
     */
    body: IErpHrmTimeTrackingReportOutput.IUpdate;
  };
  export type Body = IErpHrmTimeTrackingReportOutput.IUpdate;
  export type Response = IErpHrmTimeTrackingReportOutput;

  export const METADATA = {
    method: "PUT",
    path: "/erpHrmTimeTracking/reportOutputs/:reportOutputId",
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
    `/erpHrmTimeTracking/reportOutputs/${encodeURIComponent(props.reportOutputId ?? "null")}`;
  export const random = (): IErpHrmTimeTrackingReportOutput =>
    typia.random<IErpHrmTimeTrackingReportOutput>();
  export const simulate = (
    connection: IConnection,
    props: update.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: update.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("reportOutputId")(() => typia.assert(props.reportOutputId));
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
 * Permanently removes a single report output row by its identifier.
 *
 * This endpoint targets the persisted grouping rows stored in the report outputs table (erp_hrm_time_tracking_report_outputs). Each row represents one grouped result for a specific report generation run and includes grouping keys such as employee_id, project_id, optional task_id, and optional week_start_date_id.
 *
 * Authorization is enforced according to the caller’s permissions within the currently selected organization context. Only authorized members should be allowed to remove report output rows that belong to that organization’s report generation runs.
 *
 * Validation and error handling:
 *
 * - If the provided reportOutputId does not exist within the selected organization context, the operation fails with a not-found style error.
 * - If the caller lacks permission to manage report outputs in the selected organization, the operation fails with an authorization error.
 *
 * This operation only removes the targeted report output row referenced by {reportOutputId}. It does not require any additional request payload.
 *
 * Related operations that are typically used around this endpoint include report generation run retrieval (to see outputs) and list/search operations over report outputs to locate the target output row before erasing it.
 *
 * @param props.connection
 * @param props.reportOutputId Identifier of the report output row to permanently remove (UUID).
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Implement erase operation for
 *   erp_hrm_time_tracking_report_outputs.
 *
 * Steps:
 * 1. Parse path parameter reportOutputId as UUID.
 * 2. Start a transaction.
 * 3. Load the target erp_hrm_time_tracking_report_outputs row by id.
 * 4. Perform authorization check by verifying the associated report_generation_run belongs to an organization that the caller can manage in the currently selected organization context. (Join through erp_hrm_time_tracking_report_generation_runs as needed.)
 * 5. If not found or not accessible, throw NotFound/Forbidden (match existing error conventions).
 * 6. Permanently remove the erp_hrm_time_tracking_report_outputs row.
 *    - Ensure the delete does not leave invalid references; rely on database constraints.
 * 7. Commit transaction.
 * 8. Return no content (empty JSON success payload if framework requires), matching responseBody null semantics.
 *
 * Edge cases:
 * - Deleting an output that is referenced by any downstream export/job should be handled by application-level consistency; if such references exist, handle according to existing conventions (typically deny or cascade if constraints exist).
 * - Ensure that authorization is always scoped to the selected organization to prevent cross-organization deletion.
 * @path /erpHrmTimeTracking/reportOutputs/:reportOutputId
 * @accessor api.functional.erpHrmTimeTracking.reportOutputs.erase
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
     * Identifier of the report output row to permanently remove (UUID).
     */
    reportOutputId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/erpHrmTimeTracking/reportOutputs/:reportOutputId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/erpHrmTimeTracking/reportOutputs/${encodeURIComponent(props.reportOutputId ?? "null")}`;
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
      assert.param("reportOutputId")(() => typia.assert(props.reportOutputId));
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
 * Create a persisted report output row for a generated time-tracking report.
 *
 * This operation inserts a new record into `erp_hrm_time_tracking_report_outputs`, which represents one grouped result produced for a specific `erp_hrm_time_tracking_report_generation_runs` row. The new output stores the grouped `employee_id`, `project_id`, optional `task_id`, optional `week_start_date_id` (when week dimension is used by the report definition), and the deterministic `grouping_sort_key` used for stable ordering and deduplication across generators. Optional `notes` can be stored for debugging or export hints, matching the purpose described on the `notes` column.
 *
 * The created output is always linked to exactly one `report_generation_run_id` through the required foreign key (`report_generation_run_id`). The database model also enforces a uniqueness constraint across `report_generation_run_id`, `employee_id`, `project_id`, `task_id`, and `week_start_date_id`; the service implementation must surface a clear validation/rejection response when a duplicate grouping is attempted for the same generation run.
 *
 * Security and organization isolation: the request must be authorized within the currently selected organization context. The service implementation must ensure the `report_generation_run_id` belongs to a report definition owned by the same organization selected for the request, preventing cross-organization access when resolving employees/projects/tasks for grouping. If report viewing/generation permission is missing, the operation must be blocked with a human-readable explanation.
 *
 * Validation rules: `employee_id`/`project_id` must refer to records in the same organization as the generation run’s organization, and `task_id` must be either null (when no task grouping is present) or valid for the specified project. `week_start_date_id` must be either null (when the report definition does not include a week dimension) or match the week dimension configuration used by the report definition for that generation run. `grouping_sort_key` must be deterministic for the grouping inputs so that downstream ordering remains stable.
 *
 * If any business validation fails (for example, uniqueness violation for the grouping within a generation run, or invalid combinations of task/week dimension), the system must reject the entire request without applying partial changes to any related metric rows. Related report output metric creation is expected to be handled by dedicated operations (or the report generation pipeline), not by this endpoint alone.
 *
 * Related operations: after outputs are created, metric breakdown lines in `erp_hrm_time_tracking_report_output_metrics` can be created/filled and later used to render/export the report. This endpoint intentionally focuses on creating the grouped output container row.
 *
 * @param props.connection
 * @param props.body Creation payload for a report output row to be associated with a report generation run and to persist its grouping composition.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification 1) Read and validate request payload (ICreate).
 *
 * 2) Authorization & scoping:
 * - Resolve the target `erp_hrm_time_tracking_report_generation_runs` row by `reportGenerationRunId`.
 * - Verify the run is accessible to the caller within the selected organization context; derive organization scope from the report definition related to the run.
 * - Enforce organization isolation for all provided grouping IDs (employee/project/task/week_start_date).
 *
 * 3) Referential integrity & compatibility validation:
 * - Ensure `employee_id` belongs to the organization-scoped member table (`erp_hrm_time_tracking_members`) that is within the derived organization.
 * - Ensure `project_id` belongs to the same organization (`erp_hrm_time_tracking_projects`).
 * - If `task_id` is provided: ensure it belongs to the specified project (`erp_hrm_time_tracking_tasks`) and is valid for the organization.
 * - If `week_start_date_id` is provided: ensure it is compatible with the report definition’s dimension configuration for week grouping (via `erp_hrm_time_tracking_report_definition_dimensions`).
 *
 * 4) Uniqueness enforcement:
 * - Rely on the DB unique constraint on (`report_generation_run_id`, `employee_id`, `project_id`, `task_id`, `week_start_date_id`).
 * - If a conflict occurs, return a business rejection indicating the grouped output for the same generation run and grouping combination already exists.
 *
 * 5) Insert:
 * - Create `erp_hrm_time_tracking_report_outputs` with:
 *   - `report_generation_run_id`
 *   - `employee_id`, `project_id`, `task_id`
 *   - `week_start_date_id`
 *   - `grouping_sort_key`
 *   - `notes`
 *   - set `created_at`/`updated_at` per service convention (or DB defaults, if present).
 *
 * 6) Transactionality:
 * - Execute insert inside a transaction.
 * - Do not create `erp_hrm_time_tracking_report_output_metrics` here; leave those to the report generation workflow to keep this endpoint’s responsibility limited to the output container row.
 *
 * 7) Response:
 * - Return the created `IerpHrmTimeTrackingReportOutput` entity (including IDs and stored grouping fields) as defined by the response DTO schema.
 * @path /erpHrmTimeTracking/reportOutputs
 * @accessor api.functional.erpHrmTimeTracking.reportOutputs.create
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
     * Creation payload for a report output row to be associated with a report generation run and to persist its grouping composition.
     */
    body: IErpHrmTimeTrackingReportOutput.ICreate;
  };
  export type Body = IErpHrmTimeTrackingReportOutput.ICreate;
  export type Response = IErpHrmTimeTrackingReportOutput;

  export const METADATA = {
    method: "POST",
    path: "/erpHrmTimeTracking/reportOutputs",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/erpHrmTimeTracking/reportOutputs";
  export const random = (): IErpHrmTimeTrackingReportOutput =>
    typia.random<IErpHrmTimeTrackingReportOutput>();
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
