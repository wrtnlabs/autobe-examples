import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IErpHrmTimeTrackingReportDefinitionFilter } from "../../../../api/structures/IErpHrmTimeTrackingReportDefinitionFilter";
import { deleteErpHrmTimeTrackingReportDefinitionsReportDefinitionIdFiltersFilterId } from "../../../../providers/deleteErpHrmTimeTrackingReportDefinitionsReportDefinitionIdFiltersFilterId";
import { getErpHrmTimeTrackingReportDefinitionsReportDefinitionIdFiltersFilterId } from "../../../../providers/getErpHrmTimeTrackingReportDefinitionsReportDefinitionIdFiltersFilterId";
import { patchErpHrmTimeTrackingReportDefinitionsReportDefinitionIdFilters } from "../../../../providers/patchErpHrmTimeTrackingReportDefinitionsReportDefinitionIdFilters";
import { postErpHrmTimeTrackingReportDefinitionsReportDefinitionIdFilters } from "../../../../providers/postErpHrmTimeTrackingReportDefinitionsReportDefinitionIdFilters";
import { putErpHrmTimeTrackingReportDefinitionsReportDefinitionIdFiltersFilterId } from "../../../../providers/putErpHrmTimeTrackingReportDefinitionsReportDefinitionIdFiltersFilterId";

@Controller("/erpHrmTimeTracking/reportDefinitions/:reportDefinitionId/filters")
export class ErphrmtimetrackingReportdefinitionsFiltersController {
  /**
   * Create and persist a new configured filter rule inside an existing time-tracking report definition.
   *
   * This operation appends one row into the report definition filter configuration model (erp_hrm_time_tracking_report_definition_filters). The created filter is owned by the selected report definition id (erp_hrm_time_tracking_report_definition_filters.report_definition_id) and represents a single filter condition expressed as:
   *
   * - field_key: the machine-readable key of the report attribute this filter applies to (e.g., employee, project, billable status, or date-range aspects).
   * - operator: the comparison/operator used to evaluate the filter.
   * - value_text (and optional value_text_2): the primary (and optional second) value(s) serialized as text, where the meaning depends on field_key and operator.
   *
   * Security and scoping:
   *
   * - Access is organization-scoped through the selected organization context. The reportDefinitionId identifies a report definition row that belongs to a specific organization (erp_hrm_time_tracking_report_definitions.erp_hrm_time_tracking_organization_id). The system must ensure that the authenticated member can operate on that organization; requests must not be able to create filters for report definitions outside the member’s accessible organization context.
   *
   * Business validation and expected behavior:
   *
   * - The system must validate that the requested filter is meaningful for the selected report definition’s configuration (the report definition dictates which filters/dimensions are applicable and how report types interpret them).
   * - When the filter inputs are invalid or cannot produce a meaningful configuration, the system must reject the request with a clear business validation message OR produce a consistent validation failure response.
   * - If the report definition already has similar filters, the system must preserve configuration consistency based on display_order and evaluation ordering rules for configured filters.
   *
   * Related data model relationships:
   *
   * - The created filter row belongs to erp_hrm_time_tracking_report_definitions via erp_hrm_time_tracking_report_definition_filters.erp_hrm_time_tracking_report_definition_id.
   * - Report generation later consumes these configured filter rows to apply intersections of filter criteria when computing report outputs.
   *
   * Related operations:
   *
   * - Clients typically first retrieve or select a report definition, then create or manage its configured filters. Report definition filters are also interpreted together with the report definition dimensions configuration when generating report runs.
   *
   * Error handling expectations:
   *
   * - The operation must fail safely for invalid inputs and must not leak information from other organizations.
   * - If the report definition does not exist (or is not accessible in the selected organization context), the operation must respond with an appropriate not-found/forbidden style error response.
   *
   *
   * @param connection
   * @param reportDefinitionId Target report definition id that owns the filter configuration to be created.
   * @param body Filter configuration payload to create a new report definition filter rule.
   *
   *             The system will persist field_key/operator/value_text/value_text_2 and the is_enabled flag as a new erp_hrm_time_tracking_report_definition_filters row associated with the provided reportDefinitionId.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Implementation steps:
   * 1. Resolve organization scope using the authenticated member’s selected UserOrganization context. Load erp_hrm_time_tracking_report_definitions by id = reportDefinitionId and verify its erp_hrm_time_tracking_organization_id is accessible.
   * 2. Validate request payload:
   *    - field_key must be non-empty and conform to expected filter-key format.
   *    - operator must be non-empty and recognized by the report generation engine.
   *    - value_text must be present.
   *    - If operator requires a second value (range-style operators), require value_text_2; otherwise ignore or reject value_text_2 based on validation rules.
   *    - is_enabled must be respected as the filter’s active/inactive flag.
   * 3. Determine display_order:
   *    - If the request provides display_order explicitly, ensure it is consistent with the definition’s existing filter ordering (avoid impossible ordering conflicts).
   *    - If the request does not provide display_order (implementation may auto-assign), set it to next available integer greater than the current maximum display_order for this report definition.
   * 4. Insert into erp_hrm_time_tracking_report_definition_filters within a transaction.
   * 5. Return the created filter record mapped to the API DTO.
   * 6. Audit (if applicable in service implementation): create an ActivityLogEntry that captures creation of a report filter configuration, using the performer attribution and target entity fields.
   *
   * Database queries:
   * - SELECT report definition by id.
   * - Optionally SELECT max(display_order) for existing filters within the same report definition.
   * - INSERT filter row.
   *
   * Edge cases:
   * - reportDefinitionId exists but is not accessible: reject.
   * - invalid operator/field_key combination for the report definition: reject with business validation error.
   * - report definition configuration where filters/dimensions do not support the requested filter: reject.
   *
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async createReportDefinitionFilter(
    @TypedParam("reportDefinitionId")
    reportDefinitionId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmTimeTrackingReportDefinitionFilter.ICreate,
  ): Promise<void> {
    try {
      return await postErpHrmTimeTrackingReportDefinitionsReportDefinitionIdFilters(
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
   * Update the configured filter rules for a specific time tracking report definition.
   *
   * This operation targets an organization-scoped report configuration stored in erp_hrm_time_tracking_report_definitions and updates its related erp_hrm_time_tracking_report_definition_filters rows. Each filter row is represented by field_key/operator/value_text/value_text_2 and is_enabled, and can be ordered deterministically via display_order. The update is intended for clients that manage report configuration in a reporting UI, allowing them to change which attributes (such as employee, project, and billable status) will be used when the system later generates report results for a requested date range.
   *
   * Security and data isolation: The report definition belongs to an organization via erp_hrm_time_tracking_report_definitions.erp_hrm_time_tracking_organization_id. The server must ensure that the authenticated member can only update filter configuration within their selected organization context and must not expose configuration across organizations.
   *
   * Business logic and validation: The report filters are configured rules that later constrain which time activity is included when generating a report run. For time report generation, multiple filters must be honored together so that the computed totals reflect the intersection of employee selection, project selection, and billable status selection (matching only the timelogs that satisfy all provided filter conditions). If the incoming filter set is invalid or cannot produce a meaningful configuration for the report definition’s declared report_type, the server must reject the request with a business validation message OR result in an empty report outcome consistently with report generation error-handling behavior. Validation must be performed before persisting changes to prevent inconsistent filter states.
   *
   * Persistence behavior: The operation updates the filter rows associated with the report definition id provided in the path parameter. It must respect the filter/definition soft-deletion flags: report definition updates should only be allowed when the target definition is active (is_active is true) and not deleted (deleted_at is null). Existing filter rows for the definition may be updated, enabled/disabled, re-ordered, or replaced according to the request. When filters are updated, display_order should be used to provide deterministic evaluation/presentation order.
   *
   * Related operations: Clients typically manage a report definition in the sequence of reading the definition and then updating its filters before initiating report generation runs. Report dimensions are configured separately in erp_hrm_time_tracking_report_definition_dimensions; this operation does not alter dimensions.
   *
   * Expected errors: If the reportDefinitionId does not exist, is deleted, or is not active, the server returns an error indicating the configuration cannot be updated. If authorization fails for the current organization context, the server returns access denied. If filter inputs fail validation for the definition’s report_type, the server returns a business validation failure without leaking configuration outside the selected organization.
   *
   * @param connection
   * @param reportDefinitionId Target report definition identifier whose filter rules will be updated.
   * @param body Filter update payload defining the desired set and configuration of erp_hrm_time_tracking_report_definition_filters rows under the target report definition.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Implementation steps:
   * 1) Resolve reportDefinitionId to erp_hrm_time_tracking_report_definitions. Validate:
   *    - definition exists
   *    - deleted_at is null
   *    - is_active is true
   *    - definition.erp_hrm_time_tracking_organization_id matches the authenticated member’s selected organization context (tenant isolation).
   * 2) Parse requestBody filter update payload into desired filter rows.
   * 3) Validate each filter item:
   *    - field_key must be a supported logical key for the report definition’s report_type.
   *    - operator must be compatible with field_key and with the semantics required by time report filtering.
   *    - value_text must satisfy required format for the operator/field_key; validate value_text_2 presence when needed (e.g., between/range operators).
   *    - is_enabled controls whether the filter participates in later evaluation.
   * 4) Validate cross-filter configuration:
   *    - Ensure the combined filters are logically consistent for the definition’s report_type (e.g., for time report type, employee/project/billable status filters must be applicable). If the configuration is invalid/non-meaningful, reject with a business validation error.
   *    - No filter update should leak information about other organizations.
   * 5) Apply persistence atomically in a database transaction:
   *    - Update existing erp_hrm_time_tracking_report_definition_filters rows for the definition when identifiers are provided in request; otherwise create new rows.
   *    - If request indicates deletion/removal, mark the old filters as removed by setting deleted_at (or by removing rows if the implementation chooses hard removal—must be consistent with schema stance). Use the presence/absence semantics defined by the request DTO.
   *    - Update display_order to match the requested order.
   * 6) Re-load the updated active (deleted_at null) filters for the definition sorted by display_order.
   * 7) Return response DTO summarizing the updated filter configuration.
   *
   * Edge cases:
   * - If request disables all filters, later report generation should safely return empty or unfiltered results depending on report_type rules; this operation still succeeds if the configuration is valid.
   * - If no filters are provided, treat as empty set per DTO semantics.
   * - Handle concurrency by ensuring deterministic results; if versioning/locks exist for report definitions, honor them (none referenced here).
   *
   * DB queries:
   * - SELECT report definition by id.
   * - SELECT existing filters by erp_hrm_time_tracking_report_definition_id where deleted_at is null.
   * - INSERT/UPDATE/DELETE (or deleted_at updates) for erp_hrm_time_tracking_report_definition_filters within a transaction.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async updateFilters(
    @TypedParam("reportDefinitionId")
    reportDefinitionId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmTimeTrackingReportDefinitionFilter.IRequest,
  ): Promise<IErpHrmTimeTrackingReportDefinitionFilter.ISummary> {
    try {
      return await patchErpHrmTimeTrackingReportDefinitionsReportDefinitionIdFilters(
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
   * Retrieve details of a single report definition filter configured for a time-tracking report definition.
   *
   * This operation is used when a member needs to view how a reusable report definition applies filtering rules during report generation. The target resource is a row in `erp_hrm_time_tracking_report_definition_filters`, uniquely identified by `id` and belonging to a specific report definition via `erp_hrm_time_tracking_report_definition_id`.
   *
   * Security and permission handling must ensure the requester is authorized to view the selected organization context. Even though this endpoint is a direct detail read, the implementation must scope the lookup to the same organization owning the referenced `erp_hrm_time_tracking_report_definitions` record, so that a user cannot enumerate filters across organizations.
   *
   * The returned filter reflects the configured evaluation logic: `field_key` indicates which report attribute the filter applies to, `operator` defines the comparison operator, `value_text` and optional `value_text_2` store the primary and secondary values for the configured operator, and `is_enabled` indicates whether the filter is currently active.
   *
   * The operation should handle absent resources by returning an appropriate not-found error when either the report definition does not exist in the requester’s authorized organization scope, or the filter does not exist under the provided report definition.
   *
   * This endpoint is complementary to the parent report definition endpoints that manage report definitions themselves and the report-generation runs that later apply the configured dimensions and filters when producing time report outputs. When combined with report-definition listing/definition detail endpoints, clients can present a full configurable report setup UI (definition metadata plus per-dimension and per-filter rules).
   *
   * @param connection
   * @param reportDefinitionId Identifier of the report definition that owns the filter configuration (UUID).
   * @param filterId Identifier of the report definition filter to retrieve (UUID).
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Implement GET detail retrieval for `erp_hrm_time_tracking_report_definition_filters` scoped by the provided reportDefinitionId.
   *
   * Algorithm:
   * 1) Parse `reportDefinitionId` and `filterId` from path parameters.
   * 2) Resolve authorization/tenant scope by loading `erp_hrm_time_tracking_report_definitions` where `id = reportDefinitionId`, and ensure it belongs to the currently selected/requester organization context.
   * 3) If the report definition is not found in the authorized scope, raise NOT_FOUND (or equivalent) without revealing whether the filter exists.
   * 4) Load the filter record from `erp_hrm_time_tracking_report_definition_filters` where:
   *    - `id = filterId`
   *    - `erp_hrm_time_tracking_report_definition_id = reportDefinitionId`
   * 5) If no such filter exists, raise NOT_FOUND.
   * 6) Map the database record to the response DTO.
   *
   * Database queries:
   * - Query 1: `erp_hrm_time_tracking_report_definitions` by `id` with organization scope.
   * - Query 2: `erp_hrm_time_tracking_report_definition_filters` by composite constraint (`id`, `erp_hrm_time_tracking_report_definition_id`).
   *
   * Validation rules:
   * - Ensure both ids are valid UUIDs at the API layer.
   * - Treat `deleted_at` as inactive/removed in the same way the service layer does for other configuration reads (do not return records that are considered removed by `deleted_at` if the codebase applies such filtering).
   *
   * Error handling:
   * - Return 404 when the report definition or the filter is not found within the authorized organization scope.
   *
   * No write operations and no side effects are allowed.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":filterId")
  public async at(
    @TypedParam("reportDefinitionId")
    reportDefinitionId: string & tags.Format<"uuid">,
    @TypedParam("filterId")
    filterId: string & tags.Format<"uuid">,
  ): Promise<IErpHrmTimeTrackingReportDefinitionFilter> {
    try {
      return await getErpHrmTimeTrackingReportDefinitionsReportDefinitionIdFiltersFilterId(
        {
          reportDefinitionId,
          filterId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Updates a specific filter rule configured inside an existing report definition.
   *
   * A report definition (erp_hrm_time_tracking_report_definitions) represents an organization-owned, reusable configuration identified by a stable code and a human-readable name. This endpoint targets one row in erp_hrm_time_tracking_report_definition_filters, which stores a single filter condition in normalized columns (field_key, operator, value_text, and optional value_text_2) along with evaluation enablement (is_enabled).
   *
   * Authorization and tenant isolation are enforced by scoping every operation to the selected organization context. Even though the identifiers are provided in the URL, the service must ensure the loaded report definition belongs to the same organization as the authenticated member and that the caller has report-management permission (the same gate used for “report viewing permission” in report flows, extended to configuration updates).
   *
   * Validation rules are applied before persisting changes:
   * - field_key/operator/value_text[/value_text_2] must form a meaningful filter configuration. If a provided combination cannot be applied for the target report definition type, the system must reject the update as invalid (consistent with the requirement that invalid filter configurations for a report type must be rejected).
   * - If the update would otherwise result in a configuration that cannot produce meaningful selections, the system must fail fast with a business validation message rather than allowing the configuration to be saved.
   *
   * When the update is applied, it changes how subsequent report generation runs will filter time activity within the report’s configured date range coverage. These filters are intended to be honored together, so updating one filter affects the resulting intersection of filter choices.
   *
   * Related behavior and consistency with report viewing/generation:
   * - List/report browsing expectations require that filter outcomes do not expose data outside the selected organization context.
   * - For time reports specifically, employee/project/billable filters are applied together as an intersection of conditions; this endpoint is the configuration mechanism that controls such filter evaluation.
   *
   * Error handling:
   * - If the report definition or filter cannot be found within the caller’s organization scope, the request is rejected.
   * - If the requested filter update fails validation, a business validation error is returned.
   * - Successful updates return the persisted filter rule reflecting the stored column values.
   *
   * @param connection
   * @param reportDefinitionId Target report definition ID that owns the filter rule configuration (scoped to the caller's organization).
   * @param filterId Target filter rule ID to update, belonging to the specified report definition (scoped to the caller's organization).
   * @param body Updated configuration for the targeted report definition filter rule. The payload updates field_key/operator/value_text/value_text_2 and whether the filter is enabled for future report generations.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Implement PUT update for erp_hrm_time_tracking_report_definition_filters.
   *
   * 1) Authenticate and identify the selected organization context from the member session.
   * 2) Parse path params: reportDefinitionId (UUID) and filterId (UUID).
   * 3) Load the report definition (erp_hrm_time_tracking_report_definitions) by id AND organization scope.
   *    - If not found, return authorization/resource-not-found error.
   * 4) Load the filter rule (erp_hrm_time_tracking_report_definition_filters) by id AND erp_hrm_time_tracking_report_definition_id == reportDefinitionId.
   *    - If not found, return resource-not-found error scoped to the report definition.
   * 5) Validate request body fields:
   *    - Ensure operator/field_key are compatible at least syntactically with the report definition’s report_type (and any configured filter dimension set).
   *    - Ensure value_text (and value_text_2 when present) matches the operator semantics (e.g., between/range operators require both values).
   *    - If validation fails (meaningless filter configuration for the target report type), return a business validation error.
   * 6) Apply updates:
   *    - Update field_key, operator, value_text, value_text_2 (nullable), is_enabled, and updated_at.
   *    - Do not change deleted_at here unless explicitly supported by the DTO; follow the DTO fields strictly.
   * 7) Persist within a transaction.
   * 8) Return the updated filter entity DTO from the persisted row.
   *
   * Edge cases:
   * - If is_enabled is set to false, the filter should be preserved but effectively ignored during future report generation.
   * - Input values that do not match any existing values should not cause system failure for report generation; however, this update still must validate configuration meaningfulness so that the filter can be applied for the report type.
   *
   * Complex dependencies:
   * - This endpoint depends on the report definition type configuration (report_type) and configured dimensions/filters evaluation logic; reuse the same validation logic used during report generation runs so that filter semantics remain consistent.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":filterId")
  public async updateFilter(
    @TypedParam("reportDefinitionId")
    reportDefinitionId: string & tags.Format<"uuid">,
    @TypedParam("filterId")
    filterId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmTimeTrackingReportDefinitionFilter.IUpdate,
  ): Promise<IErpHrmTimeTrackingReportDefinitionFilter> {
    try {
      return await putErpHrmTimeTrackingReportDefinitionsReportDefinitionIdFiltersFilterId(
        {
          reportDefinitionId,
          filterId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently removes a configured filter from a time-tracking report definition.
   *
   * This endpoint targets exactly one filter row in the underlying configuration table `erp_hrm_time_tracking_report_definition_filters`, identified by `filterId` and constrained to belong to the specified report definition `reportDefinitionId` (`erp_hrm_time_tracking_report_definition_id`). The filter row contains a `field_key`, an `operator`, and one or two serialized values (`value_text`, `value_text_2`), plus an `is_enabled` flag and an ordering hint (`display_order`).
   *
   * Authorization and tenant isolation are required because report definitions are organization-owned (`erp_hrm_time_tracking_report_definitions.erp_hrm_time_tracking_organization_id`). The caller must have permission to manage report definitions within the selected organization context; otherwise the request must be rejected without exposing whether the filter exists.
   *
   * Validation rules: the service must verify that the filter with `filterId` exists and that it is attached to the provided `reportDefinitionId`. If the filter does not exist under that report definition, the operation must return an appropriate not-found outcome.
   *
   * Error handling and safety: the operation must complete deterministically and must not attempt to modify other filters. On success, it returns no response body. Any failure should be returned as a business/technical error consistent with the service’s error handling conventions.
   *
   * Related operations: clients typically call this alongside report-definition management endpoints (e.g., listing available filters and regenerating time report outputs based on the report definition) to update the filter set used during time report generation.
   *
   * @param connection
   * @param reportDefinitionId Target report definition ID whose configured filters are being managed (UUID). The filter must belong to this definition.
   * @param filterId Target filter ID to permanently remove from the report definition (UUID). Must be associated with the provided reportDefinitionId.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Implement DELETE (erase) for a single report-definition filter.
   *
   * 1) Parse path params:
   *    - reportDefinitionId (UUID string)
   *    - filterId (UUID string)
   *
   * 2) Authorization:
   *    - Resolve the caller’s selected organization context.
   *    - Fetch `erp_hrm_time_tracking_report_definitions` by `id = reportDefinitionId` and ensure its `erp_hrm_time_tracking_organization_id` matches the caller’s selected organization.
   *    - If not found or outside organization, deny with an authorization/404-equivalent outcome.
   *
   * 3) Ownership/association check:
   *    - Query `erp_hrm_time_tracking_report_definition_filters` by `id = filterId`.
   *    - Validate that `erp_hrm_time_tracking_report_definition_filters.erp_hrm_time_tracking_report_definition_id == reportDefinitionId`.
   *    - If mismatch or missing, return not-found.
   *
   * 4) Deletion:
   *    - Perform the removal of the filter row from `erp_hrm_time_tracking_report_definition_filters` (use repository delete/deleteById in a transaction).
   *    - Do not change other rows.
   *
   * 5) Consistency:
   *    - If the system stores filter ordering (`display_order`) and the client later reorders filters, no renumbering is required here unless explicitly required by other parts of the service. Keep other filters unchanged.
   *
   * 6) Transaction boundaries:
   *    - Use a single DB transaction covering the association check and delete (or enforce via FK constraint plus atomic delete strategy).
   *
   * 7) Response:
   *    - Return HTTP success with no JSON body.
   *
   * 8) Edge cases:
   *    - If there are concurrent updates to the same report definition filters, ensure the delete either succeeds for the current row version or returns a concurrency-friendly error according to the project’s standard.
   *
   * Audit (if applicable):
   * - If the service records actions in `erp_hrm_time_tracking_activity_log_entries`, write an activity entry indicating the filter erase operation along with the target entity identifiers.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":filterId")
  public async erase(
    @TypedParam("reportDefinitionId")
    reportDefinitionId: string & tags.Format<"uuid">,
    @TypedParam("filterId")
    filterId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteErpHrmTimeTrackingReportDefinitionsReportDefinitionIdFiltersFilterId(
        {
          reportDefinitionId,
          filterId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
