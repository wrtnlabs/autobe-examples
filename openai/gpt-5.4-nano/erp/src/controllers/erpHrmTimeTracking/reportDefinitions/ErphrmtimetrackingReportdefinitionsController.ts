import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IErpHrmTimeTrackingReportDefinition } from "../../../api/structures/IErpHrmTimeTrackingReportDefinition";
import { IPageIErpHrmTimeTrackingReportDefinition } from "../../../api/structures/IPageIErpHrmTimeTrackingReportDefinition";
import { deleteErpHrmTimeTrackingReportDefinitionsReportDefinitionId } from "../../../providers/deleteErpHrmTimeTrackingReportDefinitionsReportDefinitionId";
import { getErpHrmTimeTrackingReportDefinitionsReportDefinitionId } from "../../../providers/getErpHrmTimeTrackingReportDefinitionsReportDefinitionId";
import { patchErpHrmTimeTrackingReportDefinitions } from "../../../providers/patchErpHrmTimeTrackingReportDefinitions";
import { postErpHrmTimeTrackingReportDefinitions } from "../../../providers/postErpHrmTimeTrackingReportDefinitions";
import { putErpHrmTimeTrackingReportDefinitionsReportDefinitionId } from "../../../providers/putErpHrmTimeTrackingReportDefinitionsReportDefinitionId";

@Controller("/erpHrmTimeTracking/reportDefinitions")
export class ErphrmtimetrackingReportdefinitionsController {
  /**
   * Creates a new ERP HRM time tracking report definition within the currently selected organization context.
   *
   * This operation persists one row in `erp_hrm_time_tracking_report_definitions` (including the organization foreign key `erp_hrm_time_tracking_organization_id`, creator reference `creator_member_id`, stable `code`, human `name`, optional `description`, `report_type`, and activation flag `is_active`) and also persists the configured report structure by creating related rows in:
   *
   * - `erp_hrm_time_tracking_report_definition_dimensions`, which defines the ordered grouping dimensions for report output using `dimension_key`, `dimension_label`, and `sort_order`.
   * - `erp_hrm_time_tracking_report_definition_filters`, which defines the filter rules using `field_key`, `operator`, `value_text`, optional `value_text_2`, `is_enabled`, and `display_order`.
   *
   * All persisted data is organization-scoped: the system must scope all inputs and resulting outputs to the user’s active organization context as required by the report access rule. If an organization context is missing, this operation must be blocked with a business validation message instructing the user to select an organization context first.
   *
   * Security and authorization: the operation is for member users who have permission to manage report definitions. The system must additionally enforce tenant isolation so a user cannot create a report definition for another organization than the currently selected one.
   *
   * Validation and business rules: the `code` must be unique within the organization because `erp_hrm_time_tracking_report_definitions` enforces `@@unique([erp_hrm_time_tracking_organization_id, code])`. The dimensions must satisfy the definition-level uniqueness constraint because `erp_hrm_time_tracking_report_definition_dimensions` enforces `@@unique([erp_hrm_time_tracking_report_definition_id, dimension_key])`, and ordering must be deterministic via `sort_order`. Filters are persisted as separate rows in `erp_hrm_time_tracking_report_definition_filters` with their `display_order` used for stable evaluation/presentation.
   *
   * Expected behavior: on success, the API returns the created report definition along with the created dimensions and filters as part of the definition representation. On failure (e.g., code collision or invalid configuration), the system must reject the request without producing a partial definition; the creation of the parent and both child configurations should be handled in a single transaction.
   *
   * Related operations: clients typically call this operation before starting report generation runs (which would use the saved `report_type` and stored dimensions/filters) and may use future update/read/delete operations for managing the definition lifecycle.
   *
   * @param connection
   * @param body Payload to create a new organization-scoped report definition with its dimensions and filters configuration.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor null
     * @x-autobe-specification Implementation steps: 1) Require authenticated
     *   member. 2) Enforce active organization context for reports (block if
     *   missing). 3) Extract request payload for parent definition fields: -
     *   Map `code`, `name`, optional `description`, `report_type`, and
     *   `is_active` to `erp_hrm_time_tracking_report_definitions`. - Set
     *   `erp_hrm_time_tracking_organization_id` from selected organization
     *   context (do NOT accept arbitrary org id). - Set `creator_member_id`
     *   from the authenticated member identity. 4) Validate uniqueness of
     *   `code` within the organization by relying on DB unique constraint
     *   `@@unique([erp_hrm_time_tracking_organization_id, code])`; on conflict,
     *   return a business validation error. 5) Begin a DB transaction. 6)
     *   Create `erp_hrm_time_tracking_report_definitions` row. 7) Create
     *   `definitionDimensions` rows: - For each dimension item, insert into
     *   `erp_hrm_time_tracking_report_definition_dimensions` with
     *   `erp_hrm_time_tracking_report_definition_id` = created definition id,
     *   `dimension_key`, `dimension_label`, `sort_order`. - Ensure
     *   request-level deduplication on `dimension_key` per definition to avoid
     *   unique constraint violation `@@unique([definition_id, dimension_key])`.
     *   8) Create `definitionFilters` rows: - For each filter item, insert into
     *   `erp_hrm_time_tracking_report_definition_filters` with
     *   `erp_hrm_time_tracking_report_definition_id` = created definition id,
     *   `field_key`, `operator`, `value_text`, optional `value_text_2`,
     *   `is_enabled`, `display_order`. 9) Commit transaction. 10) Return
     *   response DTO mapped from the created parent row and its child rows.
   *
   * Edge cases:
   * - Missing/empty dimensions or filters: allow creation as long as business rules for report generation accept it.
   * - Large dimension/filter arrays: apply configured limits if present in service layer validation; otherwise rely on DB constraints and request validation.
   * - If any child insert fails, roll back the whole transaction so no partially created definition remains.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @TypedBody()
    body: IErpHrmTimeTrackingReportDefinition.ICreate,
  ): Promise<IErpHrmTimeTrackingReportDefinition> {
    try {
      return await postErpHrmTimeTrackingReportDefinitions({
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered and paginated list of time-tracking report definitions available within the caller’s currently selected organization context.
   *
   * This endpoint is designed for report browsing UI and integrations that need to search report templates by organization-owned configuration. The underlying persisted configuration is stored in `erp_hrm_time_tracking_report_definitions`, including a stable `code`, human-friendly `name`, optional `description`, `report_type`, `is_active` eligibility, and organization scoping through `erp_hrm_time_tracking_organization_id`. The operation also exposes creator/audit and lifecycle metadata such as `created_at` and `updated_at`, and it respects the definition-level `deleted_at` state so removed definitions are not presented as active candidates.
   *
   * Security and authorization are organization-scoped: when an organization context is not selected, the operation must be blocked with a business validation message that instructs the user to select an organization context before accessing reports. When an organization context is present, all filtering and results are scoped strictly to that organization; report definitions from other organizations must never appear in results, even if a client passes filter values that would match other tenants.
   *
   * Filtering behavior is implemented as a PATCH request with a request body to support complex criteria. Typical criteria include selecting by `code` or `name` fragments, `report_type`, and `is_active` (or equivalent toggles), and optionally restricting to a created/updated time window where supported by the request DTO. The handler must apply pagination and sorting consistently and deterministically for stable UI paging.
   *
   * Error handling: if organization context is missing, return a business validation rejection consistent with the system’s report access error scenarios. For other business validation failures, ensure the rejection message clearly states what prevented completion without leaking sensitive cross-organization data. Unexpected internal errors must not change any persisted state (no write actions occur in this endpoint).
   *
   * Related operations: use this endpoint to discover available report definitions, then use report-generation/run endpoints (based on the chosen definition) to produce actual report outputs for a given parameter set.
   *
   * @param connection
   * @param body Search and pagination criteria for report definitions within the selected organization context.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor null
     * @x-autobe-specification Implement a list/search handler for
     *   `erp_hrm_time_tracking_report_definitions`:
   *
   * 1) Resolve and validate the selected organization context for the caller.
   *    - If no organization context is selected, reject the request with a business-validation error.
   * 2) Build a query constrained to `erp_hrm_time_tracking_organization_id = selectedOrganizationId`.
   * 3) Apply request-body filters (from `IErpHrmTimeTrackingReportDefinition.IRequest`) onto columns:
   *    - `code` and/or `name` (support partial matching where DTO specifies)
   *    - `report_type`
   *    - `is_active`
   *    - Optional date ranges using `created_at` and/or `updated_at`
   *    - Exclude records where `deleted_at` is not null.
   * 4) Apply sorting:
   *    - If DTO provides sort fields, map them to actual columns (e.g., `created_at`, `updated_at`, `name`, `code`).
   *    - Apply a deterministic secondary order by `id` when necessary.
   * 5) Apply pagination:
   *    - Use limit/offset (or cursor, depending on shared paging DTO conventions inside `IErpHrmTimeTrackingReportDefinition.IRequest`).
   *    - Return `pagination` metadata plus `data`.
   * 6) Select only summary fields for each item (DTO `IErpHrmTimeTrackingReportDefinition.ISummary`) to avoid over-fetching.
   * 7) Return the paginated response type `IPageIErpHrmTimeTrackingReportDefinition.ISummary`.
   *
   * Edge cases:
   * - If filters match zero records, return an empty `data` array with valid pagination metadata.
   * - If the organization has no report definitions, still succeed with an empty result set (no crash).
   * - Do not record any activity log entry because this endpoint is read-only (no action completes business state changes).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @TypedBody()
    body: IErpHrmTimeTrackingReportDefinition.IRequest,
  ): Promise<IPageIErpHrmTimeTrackingReportDefinition.ISummary> {
    try {
      return await patchErpHrmTimeTrackingReportDefinitions({
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single report definition configuration by its identifier.
   *
   * This endpoint returns the persisted configuration for an organization-owned report definition stored in `erp_hrm_time_tracking_report_definitions`. The returned fields include the stable `code`, human-readable `name`, optional `description`, the `report_type` key that determines supported output shape, and its `is_active` eligibility flag.
   *
   * Organization scoping is mandatory: when the request is executed, the system must ensure the report definition belongs to the currently selected organization context. This aligns with the report access requirements that block report operations without an active organization context and scope all inputs/outputs to that organization only.
   *
   * The operation must also respect deletion status. The underlying table includes `deleted_at`; when `deleted_at` is not null, the definition is considered removed from active use. The system should deny access or treat it as not found to clients, rather than returning the deleted record.
   *
   * If there is no matching report definition for the given `reportDefinitionId` in the currently selected organization, the system must return a business-appropriate not-found result.
   *
   * Related operations:
   *
   * - Use report generation runs and outputs flows (report-related endpoints) after selecting a definition returned by this operation.
   * - If clients need to browse definitions, use the corresponding list/search operation for report definitions (not included in this endpoint).
   *
   * @param connection
   * @param reportDefinitionId Identifier of the report definition to retrieve (must belong to the currently selected organization).
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor null
     * @x-autobe-specification Implementation steps: 1) Extract
     *   `reportDefinitionId` from path. 2) Enforce organization context
     *   requirement for report operations: - If no organization context is
     *   selected for the current member session, block the request with a
     *   business validation message. 3) Authorize the current member: - Verify
     *   the member has `report:view` capability within the selected
     *   organization. - If unauthorized, block the request. 4) Fetch report
     *   definition row from `erp_hrm_time_tracking_report_definitions` where: -
     *   `id == reportDefinitionId` - `erp_hrm_time_tracking_organization_id ==
     *   selectedOrganizationId` 5) Deletion handling: - If the row exists but
     *   `deleted_at` is not null, treat it as inaccessible (return not found or
     *   access denied consistent with the API error model). 6) Return a single
     *   response DTO representing the report definition entity with fields: -
     *   id, code, name, description, report_type, is_active, created_at,
     *   updated_at (Creator member identity may be included only if the
     *   referenced response DTO requires it; otherwise omit at mapping layer.)
     *   7) Edge cases: - If no row matches (wrong id or wrong organization),
     *   return not-found.
   *
   * Database access considerations:
   * - Use a single query (or query + authorization join only if needed) and avoid loading unrelated rows.
   * - No transaction is required because this is a read-only operation.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":reportDefinitionId")
  public async at(
    @TypedParam("reportDefinitionId")
    reportDefinitionId: string & tags.Format<"uuid">,
  ): Promise<IErpHrmTimeTrackingReportDefinition> {
    try {
      return await getErpHrmTimeTrackingReportDefinitionsReportDefinitionId({
        reportDefinitionId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update an existing organization-owned report definition configuration.
   *
   * This endpoint modifies a persisted report definition row in `erp_hrm_time_tracking_report_definitions`, which is tenant-owned via `erp_hrm_time_tracking_organization_id`. The report definition controls reusable report generation inputs, including `code` (stable unique identifier within the organization), `name`, `description` (optional), `report_type`, and activation eligibility via `is_active`. The operation also updates `updated_at` automatically as part of the persistence layer.
   *
   * Authorization is organization-scoped: the caller must have an active organization context selected, and all validation and persistence must be scoped to that organization only. If organization context is missing, report operations are blocked and a business validation message must indicate that an organization context must be selected before accessing reports. Additionally, when the targeted report definition does not belong to the selected organization, the operation must be denied.
   *
   * The system must respect the definition lifecycle fields in the database model. The row contains `deleted_at` to mark the definition as removed; updates must not target rows that are already deleted. When updating `code`, uniqueness must be enforced within the organization using the composite unique constraint on `(erp_hrm_time_tracking_organization_id, code)`. Invalid `report_type` values are rejected based on server-side supported report types as implemented by the report generation subsystem.
   *
   * On success, this operation returns the updated report definition entity, reflecting the new values of `code`, `name`, `description`, `report_type`, and `is_active` (as provided in the request), while preserving the same `id` and organization ownership.
   *
   * Related operations: clients typically retrieve report definitions using report-definition listing/detail endpoints first, then use this PUT endpoint to edit the selected definition.
   *
   * @param connection
   * @param reportDefinitionId Target report definition identifier to update.
   * @param body Update fields for the specified report definition. The `id` and organization ownership are taken from the path and server context; only mutable fields are accepted.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor null
     * @x-autobe-specification Implement service-layer update for a single
     *   report definition.
   *
   * 1) Validate organization context exists before proceeding (organization-scoped gating for all report operations).
   * 2) Parse `reportDefinitionId` path parameter.
   * 3) Load the target `erp_hrm_time_tracking_report_definitions` row by id, ensuring it belongs to the selected organization (`erp_hrm_time_tracking_organization_id`).
   *    - If not found, or belongs to another organization, return access denied / not found as defined by the error strategy.
   * 4) Reject updates when the row has `deleted_at` set (definition already removed).
   * 5) Validate request body fields against business rules:
   *    - Enforce composite uniqueness for `code` within the organization using `(erp_hrm_time_tracking_organization_id, code)`.
   *    - Validate `is_active` is boolean.
   *    - Validate `report_type` is supported by the report generator configuration for this service.
   *    - Optionally validate `name` non-empty and `description` length rules if present in DTO validation.
   * 6) Apply changes to the loaded entity fields: `code`, `name`, `description`, `report_type`, `is_active`.
   * 7) Persist within a transaction; update `updated_at`.
   * 8) Record an activity log entry only if the action is treated as completed successfully, and do not record misleading logs for rejected validation attempts.
   * 9) Return the updated entity mapped to the `IErpHrmTimeTrackingReportDefinition` response DTO.
   *
   * Edge cases:
   * - If `code` is unchanged, uniqueness check should still pass.
   * - If the requested values are identical to existing values, still perform persistence consistently and return the entity.
   * - If the organization has zero employees or timelogs, this update endpoint must still succeed; that rule applies to report generation, not definition editing.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":reportDefinitionId")
  public async update(
    @TypedParam("reportDefinitionId")
    reportDefinitionId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmTimeTrackingReportDefinition.IUpdate,
  ): Promise<IErpHrmTimeTrackingReportDefinition> {
    try {
      return await putErpHrmTimeTrackingReportDefinitionsReportDefinitionId({
        reportDefinitionId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently removes a report definition that belongs to the currently selected organization.
   *
   * This endpoint targets the organization-owned record represented by the `erp_hrm_time_tracking_report_definitions` table. That table stores an `id` (UUID), a stable `code` unique per organization, a human-readable `name`, an optional `description`, a `report_type`, an `is_active` flag, and auditing timestamps (`created_at`, `updated_at`). The table also includes a `deleted_at` timestamp column used to reflect whether the definition has been removed from availability.
   *
   * Only authenticated members can call this operation, and access must be enforced within the currently selected organization context. The target `reportDefinitionId` must identify a definition that belongs to the same selected organization; otherwise the request must be rejected as not found or not permitted, preventing cross-organization access.
   *
   * Validation and behavior rules:
   * - The `reportDefinitionId` parameter must be a valid UUID.
   * - If no `erp_hrm_time_tracking_report_definitions` row exists for that `id` within the selected organization, the operation must fail with an appropriate error indicating the definition cannot be found.
   * - Deleting a definition must also ensure it is no longer available for future report generation runs and list views that filter by active/availability, consistent with the stored `is_active` and `deleted_at` state.
   *
   * Error handling:
   * - If the caller lacks the required organization management capability, reject the request.
   * - If the definition exists but belongs to another organization, reject as not accessible.
   *
   * Related operations that are commonly used together:
   * - `GET /reportDefinitions/{reportDefinitionId}` (to retrieve details before removal)
   * - `PATCH /reportDefinitions` (to browse definitions and confirm `code`/`name`)
   *
   * Note: The operation is implemented to use the `deleted_at` column semantics present in `erp_hrm_time_tracking_report_definitions`, so clients should treat the definition as removed after the request succeeds.
   *
   * @param connection
   * @param reportDefinitionId Unique identifier of the report definition to remove. Must be a UUID of an `erp_hrm_time_tracking_report_definitions` record within the selected organization context.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor null
     * @x-autobe-specification Implementation steps for Realize Agent: 1) Parse
     *   `reportDefinitionId` from path and validate it is a UUID. 2) Resolve
     *   the caller’s selected organization context (the
     *   `erp_hrm_time_tracking_report_definitions.erp_hrm_time_tracking_organization_id`
     *   scope). 3) Authorization: require an organization-scoped capability
     *   suitable for managing report configurations (at minimum an organization
     *   management permission; deny guests and deny members without that
     *   capability). 4) Fetch the target row: - Query
     *   `erp_hrm_time_tracking_report_definitions` where `id =
     *   reportDefinitionId` AND `erp_hrm_time_tracking_organization_id =
     *   selectedOrganizationId`. - If not found, throw a
     *   not-found/not-accessible business error. 5) Perform deletion in a
     *   single transaction: - Update the row’s `deleted_at` to current
     *   timestamp. - Optionally set `is_active` to false if your service layer
     *   enforces availability via `is_active`; ensure consistency with how
     *   list/search operations filter by active state. - Update `updated_at` to
     *   current timestamp if the schema/service layer requires it. 6) Create an
     *   activity log entry (if the service layer for audit requires it)
     *   referencing the organization and the actor (`creator_member_id` is the
     *   record creator; the performedBy actor for the log should be the
     *   authenticated member making the request). 7) Return HTTP success (204)
     *   with no response body.
   *
   * Edge cases:
   * - If the definition is already marked as deleted (`deleted_at` not null), either treat the operation as idempotent success or return a business-level error indicating it is unavailable—follow the service’s standard behavior for repeated deletes.
   * - Ensure no cross-organization mutation occurs by always scoping the UPDATE by `erp_hrm_time_tracking_organization_id`.
   *
   * No cascading deletes should be assumed without schema confirmation; prefer marking the definition as removed via `deleted_at` to preserve referential integrity with any generation runs/outputs that may reference the report definition.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":reportDefinitionId")
  public async erase(
    @TypedParam("reportDefinitionId")
    reportDefinitionId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteErpHrmTimeTrackingReportDefinitionsReportDefinitionId({
        reportDefinitionId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
