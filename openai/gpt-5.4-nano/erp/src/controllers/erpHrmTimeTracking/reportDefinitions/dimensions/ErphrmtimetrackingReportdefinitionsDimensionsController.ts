import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IErpHrmTimeTrackingReportDefinitionDimension } from "../../../../api/structures/IErpHrmTimeTrackingReportDefinitionDimension";
import { deleteErpHrmTimeTrackingReportDefinitionsReportDefinitionIdDimensionsDimensionId } from "../../../../providers/deleteErpHrmTimeTrackingReportDefinitionsReportDefinitionIdDimensionsDimensionId";
import { getErpHrmTimeTrackingReportDefinitionsReportDefinitionIdDimensionsDimensionId } from "../../../../providers/getErpHrmTimeTrackingReportDefinitionsReportDefinitionIdDimensionsDimensionId";
import { patchErpHrmTimeTrackingReportDefinitionsReportDefinitionIdDimensions } from "../../../../providers/patchErpHrmTimeTrackingReportDefinitionsReportDefinitionIdDimensions";
import { postErpHrmTimeTrackingReportDefinitionsReportDefinitionIdDimensions } from "../../../../providers/postErpHrmTimeTrackingReportDefinitionsReportDefinitionIdDimensions";
import { putErpHrmTimeTrackingReportDefinitionsReportDefinitionIdDimensionsDimensionId } from "../../../../providers/putErpHrmTimeTrackingReportDefinitionsReportDefinitionIdDimensionsDimensionId";

@Controller(
  "/erpHrmTimeTracking/reportDefinitions/:reportDefinitionId/dimensions",
)
export class ErphrmtimetrackingReportdefinitionsDimensionsController {
  /**
   * Add a new grouping dimension to an existing report definition configuration.
   *
   * This operation creates a row in `erp_hrm_time_tracking_report_definition_dimensions` under the parent `erp_hrm_time_tracking_report_definitions` identified by `reportDefinitionId`. Each created row represents exactly one dimension used when aggregating report outputs (for example: employee, project, task, or week), and it includes a machine-readable `dimension_key`, a UI-friendly `dimension_label`, and a 1-based `sort_order` for deterministic grouping and presentation.
   *
   * Security and access control are organization-context dependent. Report-related operations require an active organization context; when organization context is missing, the system must block the request with a business validation message indicating the user must select an organization context before accessing reports. When organization context is present, the system must scope both the parent report definition and the created dimension row to that organization only.
   *
   * Relationship rules: the `erp_hrm_time_tracking_report_definition_dimensions` row belongs to its parent `erp_hrm_time_tracking_report_definitions` via `erp_hrm_time_tracking_report_definition_id`. Because the endpoint path provides `reportDefinitionId`, the request body should only contain the dimension configuration fields (`dimension_key`, `dimension_label`, `sort_order`) rather than any parent identifiers.
   *
   * Validation and database constraints:
   *
   * - The parent report definition must exist for the selected organization and be eligible for configuration updates. The parent model includes `is_active` and `deleted_at`; when the report definition is inactive or deleted, the operation must be rejected.
   * - Uniqueness is enforced per report definition configuration:
   * - `dimension_key` must be unique within the same `erp_hrm_time_tracking_report_definition_id`.
   * - `sort_order` must be unique within the same `erp_hrm_time_tracking_report_definition_id`.
   * When either uniqueness constraint would be violated, the system must reject the creation attempt (e.g., returning HTTP 409).
   *
   * Expected behavior:
   *
   * - On success, the operation returns the created dimension configuration row, including its generated `id`.
   * - On failure, the system must not create any partial dimension rows.
   *
   * Related operations: clients commonly use this endpoint alongside report definition viewing/updating and report generation endpoints. When a user intends to modify dimension ordering or keys, they should create new dimensions here only when the new `dimension_key` and `sort_order` are both acceptable within the parent report definition.
   *
   * @param connection
   * @param reportDefinitionId Target report definition ID that owns the dimension configuration being created.
   * @param body Dimension configuration values to add under the specified report definition. The parent reportDefinitionId is provided by the path.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor null
     * @x-autobe-specification Implement POST
     *   /reportDefinitions/{reportDefinitionId}/dimensions as creation of one
     *   erp_hrm_time_tracking_report_definition_dimensions record.
   *
   * 1) Parse path parameter reportDefinitionId.
   * 2) Resolve current organization context from the authenticated member/session. Block if no organization context exists (per report error scenario requirement).
   * 3) Load parent report definition: SELECT from erp_hrm_time_tracking_report_definitions where id = reportDefinitionId AND erp_hrm_time_tracking_organization_id = currentOrganizationId AND deleted_at IS NULL.
   *    - If not found, return 404.
   *    - Check is_active == true; otherwise return 400/403 as appropriate (operation not allowed).
   * 4) Validate request body fields:
   *    - dimension_key: non-empty string.
   *    - dimension_label: non-empty string.
   *    - sort_order: integer; treat as 1-based ordering (ensure > 0).
   * 5) Enforce uniqueness constraints within the parent using either pre-checks or rely on DB constraint handling:
   *    - Unique (reportDefinitionId, dimension_key)
   *    - Unique (reportDefinitionId, sort_order)
   *    If a conflict occurs, return 409 with an error indicating which constraint failed.
   * 6) Insert new row into erp_hrm_time_tracking_report_definition_dimensions with:
   *    - erp_hrm_time_tracking_report_definition_id = reportDefinitionId
   *    - dimension_key, dimension_label, sort_order
   * 7) Return the inserted row as response.
   * 8) Do not record misleading activity logs for rejected actions; only create activity log entries when the creation actually succeeds (where applicable by the service design).
   *
   * Transaction: wrap steps 3-7 in a single DB transaction to prevent race conditions around uniqueness constraints.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async createReportDefinitionDimension(
    @TypedParam("reportDefinitionId")
    reportDefinitionId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmTimeTrackingReportDefinitionDimension.ICreate,
  ): Promise<IErpHrmTimeTrackingReportDefinitionDimension> {
    try {
      return await postErpHrmTimeTrackingReportDefinitionsReportDefinitionIdDimensions(
        {
          reportDefinitionId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update the configured grouping dimensions for a specific report definition.
   *
   * This endpoint manages the rows of `erp_hrm_time_tracking_report_definition_dimensions`, which define how report output can be grouped and labeled. Each row stores a machine-readable `dimension_key`, a human-friendly `dimension_label`, and a 1-based `sort_order` to provide deterministic grouping and presentation. The `dimension_key` is constrained to be unique per report definition (`@@unique([report_definition_id, dimension_key])`).
   *
   * Because `erp_hrm_time_tracking_report_definition_dimensions` also has a `deleted_at` timestamp, the operation must treat any dimension marked as removed as no longer part of the active configuration for that report definition. Any newly added or updated dimension must preserve the uniqueness rule and must keep `sort_order` consistent with the provided ordering in the request.
   *
   * Security and authorization:
   * - This operation is organization-scoped through the selected report definition. The system must ensure the caller has permission to access and manage report definitions within the active organization context.
   * - If the caller has no active organization context selected, the system must block the request for report-related operations and present a validation message requiring organization context selection.
   *
   * Validation and business rules:
   * - The request must only affect the target report definition identified by `{reportDefinitionId}`.
   * - The system must reject cases where the request contains duplicate `dimension_key` values for the same report definition.
   * - The system must validate and persist `sort_order` as an integer ordering used for deterministic presentation.
   *
   * Related operations:
   * - Use this operation together with report definition operations (e.g., reading/updating a report definition) to ensure the dimension configuration matches the selected report type.
   * - Report generation endpoints (not implemented here) consume these dimension configurations to shape report output grouping behavior.
   *
   * Expected behavior:
   * - On success, the response reflects the updated active dimensions for the report definition, using the updated `dimension_key`, `dimension_label`, and `sort_order` values.
   *
   * @param connection
   * @param reportDefinitionId Target report definition identifier whose grouping dimensions are being updated.
   * @param body Set of dimension configurations to apply to the report definition. The system will upsert provided dimensions and remove dimensions not included by marking them as removed via deleted_at.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor null
     * @x-autobe-specification Implementation steps: 1) Parse
     *   `{reportDefinitionId}` from path as UUID. 2) Load
     *   `erp_hrm_time_tracking_report_definitions` by id and join/check that it
     *   belongs to the caller’s active organization context. - If organization
     *   context is missing, block with a business validation error. - If the
     *   caller lacks permission, block with authorization error. 3) Validate
     *   request payload: - Ensure request dimension changes contain no
     *   duplicate `dimension_key` within the same request batch. 4) Perform
     *   database transaction: - Fetch existing
     *   `erp_hrm_time_tracking_report_definition_dimensions` for the report
     *   definition where `deleted_at` is null. - For each requested dimension:
     *   a) If it matches an existing active row by `dimension_key`, update
     *   `dimension_label` and `sort_order`. b) If it does not exist, create a
     *   new row with `dimension_key`, `dimension_label`, and `sort_order`. -
     *   For any existing active row whose `dimension_key` is not present in the
     *   request, mark it as removed by setting `deleted_at` to current
     *   timestamp. - For soft-deleted rows (deleted_at not null), do not
     *   resurrect unless the request includes that `dimension_key`; if
     *   included, treat as upsert by creating a new active row or clearing
     *   deleted_at per implementation preference—prefer updating by reusing the
     *   existing row when possible. - Enforce/let DB enforce uniqueness of
     *   `(report_definition_id, dimension_key)`; if the DB rejects due to
     *   duplicates, convert to a business validation error. 5) After commit,
     *   query the active dimensions (`deleted_at is null`) ordered by
     *   `sort_order` and return them as summaries.
   *
   * Edge cases:
   * - Empty request should remove all existing active dimensions for the report definition (set deleted_at for each existing row).
   * - If sorting values are non-contiguous, still persist as provided; deterministic order is guaranteed by `sort_order` integers.
   * - If invalid `sort_order` type is provided (non-integer), reject at request validation layer.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async updateDimensions(
    @TypedParam("reportDefinitionId")
    reportDefinitionId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmTimeTrackingReportDefinitionDimension.IRequest,
  ): Promise<IErpHrmTimeTrackingReportDefinitionDimension.ISummary> {
    try {
      return await patchErpHrmTimeTrackingReportDefinitionsReportDefinitionIdDimensions(
        {
          reportDefinitionId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single report definition grouping dimension.
   *
   * This operation reads exactly one row from `erp_hrm_time_tracking_report_definition_dimensions` identified by `id`, and returns its configuration needed to understand how report output will be grouped and presented. The grouping dimension defines a machine-readable `dimension_key`, a human-friendly `dimension_label`, and an ordering position via `sort_order` for deterministic rendering.
   *
   * Access to this resource must be scoped to the currently selected organization context. Because report definition dimensions belong to a `erp_hrm_time_tracking_report_definitions` row (via `erp_hrm_time_tracking_report_definition_id`), the operation must ensure that the requested `reportDefinitionId` belongs to the active organization and that the caller has permission to view reports in that organization (report access is governed by the `report:view` capability).
   *
   * Validation rules:
   * - `reportDefinitionId` must identify an existing report definition.
   * - `dimensionId` must identify an existing dimension row.
   * - The dimension must be associated with the given report definition id; if not, the operation must fail with a not-found style business validation (to avoid leaking cross-organization or cross-definition data).
   *
   * Expected behavior for missing configuration:
   * - If no dimension exists for the supplied identifiers, the system returns an error indicating the resource cannot be found.
   *
   * Related concepts and relationships:
   * - Dimensions are owned by a report definition (`erp_hrm_time_tracking_report_definition_dimensions.reportDefinition`).
   * - The dimension key uniqueness is enforced per report definition (`@@unique([erp_hrm_time_tracking_report_definition_id, dimension_key])`), but this operation retrieves by primary key (`id`).
   *
   * @param connection
   * @param reportDefinitionId Target report definition ID that owns the grouping dimension configuration (scoped to the selected organization).
   * @param dimensionId Target report definition dimension ID to retrieve.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor null
     * @x-autobe-specification Implement a detail-read endpoint.
   *
   * Algorithm / service logic:
   * 1. Resolve `reportDefinitionId` to the corresponding `erp_hrm_time_tracking_report_definitions` row, ensuring it belongs to the currently selected organization context.
   * 2. Resolve `dimensionId` to `erp_hrm_time_tracking_report_definition_dimensions`.
   * 3. Verify the dimension row’s `erp_hrm_time_tracking_report_definition_id` matches the resolved `reportDefinitionId`.
   *    - If it does not match, return a not-found style error.
   * 4. Return the dimension configuration fields.
   *
   * Database access:
   * - Query `erp_hrm_time_tracking_report_definitions` by `id` and organization scope.
   * - Query `erp_hrm_time_tracking_report_definition_dimensions` by `id` and the foreign key `erp_hrm_time_tracking_report_definition_id`.
   *
   * Edge cases:
   * - If the report definition does not exist in the active organization, fail with not-found/validation error.
   * - If the dimension exists but belongs to a different report definition, fail with not-found/validation error.
   *
   * Authorization:
   * - Require permission to view organization reports (`report:view`) for the caller’s role in the selected organization context.
   *
   * Transaction:
   * - Read-only; no transaction required unless your data access layer requires consistent reads.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":dimensionId")
  public async at(
    @TypedParam("reportDefinitionId")
    reportDefinitionId: string & tags.Format<"uuid">,
    @TypedParam("dimensionId")
    dimensionId: string & tags.Format<"uuid">,
  ): Promise<IErpHrmTimeTrackingReportDefinitionDimension> {
    try {
      return await getErpHrmTimeTrackingReportDefinitionsReportDefinitionIdDimensionsDimensionId(
        {
          reportDefinitionId,
          dimensionId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Updates an existing report grouping dimension inside a specific report definition configuration.
   *
   * This operation targets the organization-owned configuration model described by `erp_hrm_time_tracking_report_definitions` and its child grouping rows represented by `erp_hrm_time_tracking_report_definition_dimensions`.
   * Each row in `erp_hrm_time_tracking_report_definition_dimensions` is one configured dimension used when aggregating report output; it defines a machine-readable `dimension_key`, a human-friendly `dimension_label`, and a deterministic presentation order via `sort_order`.
   *
   * Security and access scope: report definitions are organization-owned (`erp_hrm_time_tracking_report_definitions.erp_hrm_time_tracking_organization_id`). Therefore, this endpoint must enforce organization context, ensuring the calling member can access only report definitions within the currently selected organization.
   * If organization context is missing, the system must block the request with a business validation message.
   *
   * Relationship rules: the `dimension` being updated must belong to the targeted `reportDefinition`.
   * The server must verify the dimension row’s `erp_hrm_time_tracking_report_definition_id` matches the `reportDefinitionId` path parameter before applying updates.
   *
   * Update and validation rules:
   * - The update must modify fields of `erp_hrm_time_tracking_report_definition_dimensions` such as `dimension_key` (dimension identity), `dimension_label` (UI header/label), and `sort_order` (1-based grouping ordering).
   * - The configuration is designed to be managed as part of report definition setup; for removals/disablement the model provides `deleted_at`.
   * When the update indicates a removal, set `deleted_at` accordingly; otherwise keep it null so the dimension remains active for future report generations.
   * - The `(erp_hrm_time_tracking_report_definition_id, dimension_key)` uniqueness constraint must be respected when changing `dimension_key`.
   * - Sorting order must remain consistent for deterministic presentation; `sort_order` is an ordering integer (the database model uses `Int` without additional constraints, so the service layer should still validate business expectations such as positive ordering if required by UI rules).
   *
   * Expected behavior and error handling:
   * - If the report definition does not exist or is not accessible in the selected organization, the request must be rejected.
   * - If the specified dimension does not exist or is not linked to the given report definition, the request must be rejected.
   * - If uniqueness constraints would be violated by the update (e.g., duplicate `dimension_key` within the same report definition), return a validation error.
   *
   * Related operations: clients typically call report definition management endpoints to create or list report definitions, then manage their dimensions with this update endpoint.
   *
   * This endpoint does not generate report runs; it only updates the configuration that later drives report generation and output grouping semantics.
   *
   * @param connection
   * @param reportDefinitionId Target report definition identifier that scopes the dimension being updated.
   * @param dimensionId Target grouping dimension identifier within the report definition to update.
   * @param body Updated configuration values for the report definition grouping dimension.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor null
     * @x-autobe-specification Implement PUT update for a single
     *   `erp_hrm_time_tracking_report_definition_dimensions` row.
   *
   * 1) Authentication/authorization and organization context
   * - Resolve the current organization context from the authenticated member session.
   * - Load `erp_hrm_time_tracking_report_definitions` by `reportDefinitionId` and ensure it belongs to the resolved organization.
   * - If organization context is missing, reject with business validation error.
   *
   * 2) Load and verify dimension row ownership
   * - Load `erp_hrm_time_tracking_report_definition_dimensions` by `dimensionId`.
   * - Verify `erp_hrm_time_tracking_report_definition_dimensions.erp_hrm_time_tracking_report_definition_id == reportDefinitionId`; otherwise reject.
   *
   * 3) Validate request payload
   * - Validate requested changes to `dimension_key`, `dimension_label`, and `sort_order` against business rules.
   * - If the request indicates deactivation/removal behavior, set `deleted_at` to current timestamp; otherwise ensure `deleted_at` remains null.
   * - If `dimension_key` changes, ensure uniqueness within the report definition scope using the unique constraint on `(erp_hrm_time_tracking_report_definition_id, dimension_key)`.
   *
   * 4) Persist update in a transaction
   * - Update only allowed columns on the dimension row.
   * - Update `updated_at`.
   *
   * 5) Error handling
   * - Not found / not linked: reject with appropriate error.
   * - Uniqueness violation: return validation error mapped to the field(s).
   *
   * 6) Return
   * - Return the updated dimension row data mapped to `IErpHrmTimeTrackingReportDefinitionDimension`.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":dimensionId")
  public async updateReportDefinitionDimension(
    @TypedParam("reportDefinitionId")
    reportDefinitionId: string & tags.Format<"uuid">,
    @TypedParam("dimensionId")
    dimensionId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmTimeTrackingReportDefinitionDimension.IUpdate,
  ): Promise<IErpHrmTimeTrackingReportDefinitionDimension> {
    try {
      return await putErpHrmTimeTrackingReportDefinitionsReportDefinitionIdDimensionsDimensionId(
        {
          reportDefinitionId,
          dimensionId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Removes one configured grouping dimension from a specific report definition.
   *
   * This operation targets `erp_hrm_time_tracking_report_definition_dimensions`, which is owned by `erp_hrm_time_tracking_report_definitions` through `erp_hrm_time_tracking_report_definition_id`. The dimension record includes `dimension_key` (machine key), `dimension_label` (UI label), and `sort_order` (presentation ordering). The operation is designed for editing a report definition’s configuration by removing a dimension so it no longer contributes to report output grouping.
   *
   * Security and scoping: all authorization must be applied within the currently selected organization context. The target report definition must belong to the selected organization via `erp_hrm_time_tracking_report_definitions.erp_hrm_time_tracking_organization_id`. The caller must be allowed to manage reporting configuration (based on the organization-scoped role/permission model).
   *
   * Validation rules: the server must verify that the `dimensionId` exists and that it belongs to the `reportDefinitionId` provided in the path. If the dimension does not belong to the specified report definition (or does not exist in the selected organization scope), the request must be rejected.
   *
   * Behavior: when the dimension is removed, the configuration should reflect that this dimension is no longer an active grouping dimension. The database schema includes `deleted_at` on the dimension; therefore the implementation should mark `deleted_at` accordingly so the dimension is treated as removed from active configuration.
   *
   * Related usage: after removing a dimension, clients typically refresh the report definition’s dimension list to obtain updated `sort_order` and the remaining `dimension_key` set. This delete operation complements the corresponding list/read endpoints for report definition dimensions (not implemented here).
   *
   * @param connection
   * @param reportDefinitionId Target report definition identifier (the parent configuration) within the selected organization scope.
   * @param dimensionId Target report definition dimension identifier to remove. Must belong to the given report definition.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor null
     * @x-autobe-specification Realize Agent implementation steps: 1) Parse
     *   `reportDefinitionId` and `dimensionId` from path. 2) Resolve the
     *   calling member’s selected organization context. 3) Load
     *   `erp_hrm_time_tracking_report_definitions` by `id = reportDefinitionId`
     *   AND `erp_hrm_time_tracking_organization_id = currentOrgId` AND ensure
     *   it is not deleted if the service treats `deleted_at` as removal. 4)
     *   Load `erp_hrm_time_tracking_report_definition_dimensions` by `id =
     *   dimensionId` AND `erp_hrm_time_tracking_report_definition_id =
     *   reportDefinition.id`. - If not found, throw NotFound/BadRequest
     *   consistent with the platform error model. 5) Authorization check:
     *   verify the caller has permission to manage report
     *   definitions/dimensions within the selected organization (per domain
     *   permission matrix). Deny with Forbidden when lacking capability. 6)
     *   Remove the dimension by setting `deleted_at = now()` (timezone-aware)
     *   rather than removing the row, matching the presence of `deleted_at` in
     *   schema. 7) Return 200/204 with no response body (operation responseBody
     *   is null).
   *
   * Edge cases:
   * - If the dimension is already marked deleted (`deleted_at` not null), treat the operation as idempotent: either no-op or return a validation error; prefer idempotent no-op to simplify client behavior.
   * - Ensure the transaction is scoped to the single update; avoid partial updates.
   * - Do not alter other dimensions’ `sort_order`; clients can re-sort by reading the remaining active dimensions.
   *
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":dimensionId")
  public async erase(
    @TypedParam("reportDefinitionId")
    reportDefinitionId: string & tags.Format<"uuid">,
    @TypedParam("dimensionId")
    dimensionId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteErpHrmTimeTrackingReportDefinitionsReportDefinitionIdDimensionsDimensionId(
        {
          reportDefinitionId,
          dimensionId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
