import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IErpHrmTimeTrackingActivityLogEntry } from "../../../../api/structures/IErpHrmTimeTrackingActivityLogEntry";
import { IPageIErpHrmTimeTrackingActivityLogEntry } from "../../../../api/structures/IPageIErpHrmTimeTrackingActivityLogEntry";
import { MemberAuth } from "../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../decorators/payload/MemberPayload";
import { deleteErpHrmTimeTrackingMemberActivityLogEntriesActivityLogEntryId } from "../../../../providers/deleteErpHrmTimeTrackingMemberActivityLogEntriesActivityLogEntryId";
import { getErpHrmTimeTrackingMemberActivityLogEntriesActivityLogEntryId } from "../../../../providers/getErpHrmTimeTrackingMemberActivityLogEntriesActivityLogEntryId";
import { patchErpHrmTimeTrackingMemberActivityLogEntries } from "../../../../providers/patchErpHrmTimeTrackingMemberActivityLogEntries";
import { postErpHrmTimeTrackingMemberActivityLogEntries } from "../../../../providers/postErpHrmTimeTrackingMemberActivityLogEntries";
import { putErpHrmTimeTrackingMemberActivityLogEntriesActivityLogEntryId } from "../../../../providers/putErpHrmTimeTrackingMemberActivityLogEntriesActivityLogEntryId";

@Controller("/erpHrmTimeTracking/member/activityLogEntries")
export class ErphrmtimetrackingMemberActivitylogentriesController {
  /**
   * Creates a new organization-scoped audit activity log entry for the ERP HRM time tracking domain.
   *
   * This operation writes a row into `erp_hrm_time_tracking_activity_log_entries`, capturing the tenant boundary via `organization_id`, the actor attribution via `performed_by_member_id`, the business event taxonomy via `action_type`, and the affected target using a polymorphic pair of `target_entity_type` and `target_entity_id`. The combination of `action_type` plus the typed target reference allows the system to explain what happened during HRM and time tracking workflows without duplicating the full target entity payload.
   *
   * Security and isolation: organization ownership is enforced through `organization_id` so that activity entries remain queryable only within the selected organization context. The performer identity must be derived/validated against the authenticated member identity; callers must not be able to forge `performed_by_member_id` for another user.
   *
   * Validation and business behavior: `summary` is required to keep the audit trail human-readable. `details` is optional for extra context. `occurred_at` represents the business time when the action actually occurred; it is used for audit ordering and later retrieval patterns, while `created_at` is managed by persistence.
   *
   * This operation is intended for true completion outcomes. In workflows where an action is rejected (for example, a timesheet rejection), the system must not record a misleading “successful” activity log entry for that failed attempt; rejected actions should be logged only with the correct outcome context.
   *
   * Related operations: activity log entries can be retrieved and browsed by using the corresponding list/detail endpoints (not defined in this task). Snapshot generation and retention are modeled separately via `erp_hrm_time_tracking_activity_log_entry_snapshots` and should be created by internal audit mechanisms when required by retention rules.
   *
   * @param connection
   * @param body Creation payload for an organization-scoped audit activity log entry, including action taxonomy and typed target reference.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implementation steps:
   * 1) Authenticate the caller as a member actor.
   * 2) Validate organization scope: resolve the selected organization context for the caller and verify the request `organizationId` matches that context (or enforce server-side override to the selected organization).
   * 3) Resolve performer identity: set/validate `performedByMemberId` to the authenticated member’s ID; do not allow arbitrary override.
   * 4) Validate polymorphic target: ensure `targetEntityType` is a supported business entity type string and that `targetEntityId` is a UUID value. (Do not attempt to fully materialize the target entity here; store reference only.)
   * 5) Validate required fields: `actionType`, `summary`, `occurredAt` must be present; `details` can be null.
   * 6) Insert into `erp_hrm_time_tracking_activity_log_entries` within a single transaction.
   * 7) If the caller indicates an action outcome that is not completed (implementation must be driven by server-side workflow outcome), reject creation to avoid misleading audit entries; align with the error-handling requirement that rejected attempts must not be logged as successful.
   * 8) Return the created record DTO mapped from the inserted row.
   *
   * Database interaction:
   * - INSERT into `erp_hrm_time_tracking_activity_log_entries` with organization_id, performed_by_member_id, action_type, target_entity_type, target_entity_id, summary, details, occurred_at.
   * - created_at/updated_at are set by database/defaults.
   *
   * Edge cases:
   * - If organization context does not match, deny with an authorization/scoping error.
   * - If the performer identity is invalid or would be mismatched, deny.
   * - If required fields are missing or malformed, return a validation error with clear messages.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IErpHrmTimeTrackingActivityLogEntry.ICreate,
  ): Promise<IErpHrmTimeTrackingActivityLogEntry> {
    try {
      return await postErpHrmTimeTrackingMemberActivityLogEntries({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered, paginated list of activity log entries for the currently selected organization.
   *
   * This endpoint queries the audit trail table `erp_hrm_time_tracking_activity_log_entries`, which records who performed an action (`performed_by_member_id`), when it happened (`occurred_at`), what happened (`action_type`), and which business entity was affected (`target_entity_type` + `target_entity_id`). It also provides human-readable context via `summary` and optional `details`.
   *
   * Because activity log entries are organization-owned audit records, the system must enforce organization isolation by only returning rows where `erp_hrm_time_tracking_activity_log_entries.organization_id` matches the currently selected organization context. The audit table also includes a `deleted_at` column; entries that are logically removed should be excluded from browsing results.
   *
   * The request supports multi-dimensional filtering aligned with available indexes on the underlying table: organization and occurred time (`organization_id`, `occurred_at`), performer (`performed_by_member_id`, `occurred_at`), polymorphic target reference (`target_entity_type`, `target_entity_id`), action type (`action_type`, `occurred_at`), and text search for `summary`/`details` (trigram indexes). The endpoint returns a paginated summary view optimized for list screens.
   *
   * Related behavior: for failed or rejected operations, the system must avoid recording misleading “successful” activity details; therefore, consumers should treat the audit log as a record of actions that actually completed according to business rules.
   *
   * Error handling: if the caller requests data outside their permitted organization context or supplies invalid filter combinations, the system returns a clear rejection/explanation without exposing sensitive cross-organization information and without applying partial state changes (this operation is read-only).
   *
   * @param connection
   * @param body Search criteria for activity log entries, including organization-scoped filters, occurred time range, action/target/performed-by filters, text search, and pagination/sorting controls.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implement as an organization-scoped audit-log search.
   *
   * 1) Input validation
   * - Parse `IErpHrmTimeTrackingActivityLogEntry.IRequest` fields (pagination, sort, and filters).
   * - Validate pagination parameters (page size bounds per shared conventions; if not provided, use defaults).
   * - Validate date range consistency for occurred_at filters (from <= to).
   *
   * 2) Organization-scoped query
   * - Base query on `erp_hrm_time_tracking_activity_log_entries`.
   * - Always apply `organization_id = selectedOrganizationId`.
   * - Exclude logically removed entries: `deleted_at IS NULL`.
   *
   * 3) Apply filters
   * - If `actionType` filter is provided, add `action_type = :actionType`.
   * - If `targetEntityType` filter is provided, add `target_entity_type = :targetEntityType`.
   * - If `targetEntityId` filter is provided, add `target_entity_id = :targetEntityId`.
   * - If `performedByMemberId` filter is provided, add `performed_by_member_id = :performedByMemberId`.
   * - If `occurredAtFrom/occurredAtTo` are provided, add `occurred_at >=` / `<=`.
   * - If text filters for `summary` and/or `details` are provided:
   *   - Use trigram search strategies consistent with the table indexes (e.g., Postgres pg_trgm with ILIKE/% and similarity where the ORM supports it).
   *   - Search `summary` and `details` columns according to which fields are requested.
   *
   * 4) Sorting and pagination
   * - Support sorting primarily by `occurred_at` and optionally by `created_at` or `updated_at` if request allows.
   * - Apply stable ordering (secondary sort by `id` if needed) to ensure deterministic pagination.
   * - Apply limit/offset (or cursor, depending on the shared paging DTO contract inside `IRequest`).
   *
   * 5) Response mapping
   * - Map each row to `IErpHrmTimeTrackingActivityLogEntry.ISummary`.
   * - Include only fields appropriate for list browsing (do not eagerly join any large snapshot data; this operation only uses columns available in `erp_hrm_time_tracking_activity_log_entries`).
   *
   * 6) Edge cases
   * - If no rows match, return an empty paginated response.
   * - If filters reference unsupported combinations, reject with a business-style error response.
   *
   * 7) Authorization and audit integrity
   * - Authorization must ensure the caller has permission to view activity logs for the selected organization (permission mapping is handled in the service/auth layers, but the query must never leak other `organization_id` values).
   * - Since this is a read operation, do not create or modify any activity log entries.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IErpHrmTimeTrackingActivityLogEntry.IRequest,
  ): Promise<IPageIErpHrmTimeTrackingActivityLogEntry.ISummary> {
    try {
      return await patchErpHrmTimeTrackingMemberActivityLogEntries({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single audit activity log entry by its identifier.
   *
   * This operation returns the persisted fields of an {@link erp_hrm_time_tracking_activity_log_entries} record, including the action type, human-readable summary, optional details text, and the occurred/created timestamps. The record is tenant-owned: the query must ensure the entry’s {@link erp_hrm_time_tracking_activity_log_entries.organization_id} matches the organization context selected by the signed-in member.
   *
   * Security and authorization are enforced through organization scoping. The service must validate that the requesting actor is a member with a valid organization context, and must deny access when the activity log entry does not belong to the selected organization. Pagination/filtering rules used for list browsing (by action type, performer, and date range) are not applicable here because this endpoint retrieves exactly one entry by id.
   *
   * Under the hood, this operation targets the audit trail table {@link erp_hrm_time_tracking_activity_log_entries}. If the implementation supports enrichment, it may also read related snapshot rows from {@link erp_hrm_time_tracking_activity_log_entry_snapshots} for additional audit context, but the response must remain centered on the requested activity log entry record.
   *
   * Expected behavior: when no entry exists with the given id in the selected organization, return a not-found style error without leaking cross-organization existence.
   *
   * This endpoint is typically used together with the list/browse operation for activity logs, where the UI first finds entries and then fetches details for a selected {@code activityLogEntryId}.
   *
   * @param connection
   * @param activityLogEntryId Identifier of the target activity log entry to retrieve (UUID).
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implementation steps:
   * 1. Extract path parameter activityLogEntryId.
   * 2. Resolve the caller’s selected organization context.
   * 3. Perform an authorization/ownership check by selecting from erp_hrm_time_tracking_activity_log_entries with conditions:
   *    - id = activityLogEntryId
   *    - organization_id = selectedOrganizationId
   * 4. If no row matches, return a rejection/error consistent with not-found-without-leaking semantics.
   * 5. If response DTO requires actor information, either map performed_by_member_id directly (if the DTO includes ids) or join erp_hrm_time_tracking_members accordingly; do not expose other-organization data.
   * 6. Map database columns to the response DTO fields:
   *    - id
   *    - organization_id (only if included by DTO contract; otherwise omit from DTO mapping)
   *    - performed_by_member_id
   *    - action_type
   *    - target_entity_type
   *    - target_entity_id
   *    - summary
   *    - details (nullable)
   *    - occurred_at
   *    - created_at
   *    - updated_at
   *    - deleted_at (nullable) only if included in DTO contract.
   * 7. Return the mapped activity log entry.
   *
   * Database considerations:
   * - Use the indexed column erp_hrm_time_tracking_activity_log_entries.organization_id together with id to keep the query efficient.
   * - Do not use any cross-tenant scanning; organization_id must always be part of the filter.
   *
   * Edge cases:
   * - The entry may have a deleted_at timestamp; behavior should follow the system’s general audit retention/view rules as reflected by the DTO contract and error scenarios.
   * - If the caller has no valid organization context, deny access before querying.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":activityLogEntryId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("activityLogEntryId")
    activityLogEntryId: string & tags.Format<"uuid">,
  ): Promise<IErpHrmTimeTrackingActivityLogEntry> {
    try {
      return await getErpHrmTimeTrackingMemberActivityLogEntriesActivityLogEntryId(
        {
          member,
          activityLogEntryId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update an existing activity log entry for an organization context.
   *
   * This endpoint targets `erp_hrm_time_tracking_activity_log_entries`, which records who performed a significant action (`performed_by_member_id`), when the action occurred (`occurred_at`), what type of action happened (`action_type`), and what business target the action affected (`target_entity_type` + `target_entity_id`). The stored `summary` is a human-readable short audit description, while optional `details` can hold additional context.
   *
   * Security and authorization are organization-scoped. The caller must operate within the currently selected organization context, and permission checks must be performed using the role context attached to the caller’s selected `UserOrganization` membership. Access to update activity entries is restricted to users who have the appropriate capability for audit administration within that selected organization.
   *
   * Validation rules apply to each updatable field. The path parameter `{activityLogEntryId}` must refer to an existing `erp_hrm_time_tracking_activity_log_entries.id` in the selected organization. `action_type`, `target_entity_type`, and `summary` must be provided with acceptable values; `details` is optional. If `occurred_at` is updated, it must remain a valid timestamp.
   *
   * When this operation fails due to business validation or access restrictions, the system must reject the request without creating misleading audit outcomes. Unexpected internal failures must not partially update the entry.
   *
   * Related operations: creation and read/search/list endpoints for activity log entries may be used to inspect history before performing an update. If the application uses snapshot history (`erp_hrm_time_tracking_activity_log_entry_snapshots`) for audit retention, this operation must define how (or whether) snapshot rows are created in relation to updated values.
   *
   * Expected behavior:
   *
   * - On success, the endpoint returns the updated activity log entry.
   * - On failure, the response explains what prevented completion (e.g., record not in selected organization, invalid update combination, insufficient authorization) without exposing sensitive organization data.
   *
   * @param connection
   * @param activityLogEntryId Target activity log entry identifier to update (UUID), scoped to the currently selected organization.
   * @param body Update payload for the activity log entry fields. The update applies to the existing entry identified by `{activityLogEntryId}` within the selected organization.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1) Authorization & tenant scoping
   * - Resolve caller member identity from the session.
   * - Determine selected organization context from the request/session (per organization-scoped access rules).
   * - Verify caller has permission to update activity log entries in that selected organization (deny if lacking).
   *
   * 2) Load and validate target row
   * - Parse `activityLogEntryId` as UUID.
   * - Query `erp_hrm_time_tracking_activity_log_entries` by `id` AND `organization_id` == selected organization id.
   * - If not found, reject with an authorization/validation-style error consistent with other rejection cases.
   *
   * 3) Validate update payload
   * - Validate required update fields per `IErpHrmTimeTrackingActivityLogEntry.IUpdate` mapping.
   * - Ensure `action_type`, `target_entity_type`, `target_entity_id`, and `summary` are present and conform to any domain constraints defined in DTO schema.
   * - `details` may be null/omitted in DTO; persist null if provided as null.
   * - `occurred_at` must be a valid timestamptz.
   *
   * 4) Apply update in a transaction
   * - Begin transaction.
   * - Update only the allowed columns from the request.
   *   - Do not change `performed_by_member_id` unless explicitly allowed by DTO (if DTO omits it, treat as read-only).
   *   - Always keep `organization_id` unchanged.
   * - If the system requires snapshotting behavior for audit retention, define the policy:
   *   - If snapshot is append-only and represents historical state, do not delete previous snapshots.
   *   - Optionally create a new snapshot row only if required by business rules for update events; otherwise leave snapshots unchanged.
   * - Commit transaction.
   *
   * 5) Response mapping
   * - Return the updated row fields as `IErpHrmTimeTrackingActivityLogEntry`.
   *
   * 6) Error handling
   * - If business validation fails, reject without partial writes and ensure no misleading activity log outcomes are created for the rejected operation.
   * - Unexpected internal failures roll back transaction and return a generic error while preserving consistency.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":activityLogEntryId")
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("activityLogEntryId")
    activityLogEntryId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmTimeTrackingActivityLogEntry.IUpdate,
  ): Promise<IErpHrmTimeTrackingActivityLogEntry> {
    try {
      return await putErpHrmTimeTrackingMemberActivityLogEntriesActivityLogEntryId(
        {
          member,
          activityLogEntryId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently removes an activity log entry identified by its ID from the time-tracking audit trail.
   *
   * This endpoint is intended for administrative or audit-management purposes where an operator needs to remove a specific audit record (for example, incorrect or misleading entries recorded for an action attempt that should not have been logged). The activity log entry is stored in `erp_hrm_time_tracking_activity_log_entries`, where each entry records the organization scope (`organization_id`), the acting member (`performed_by_member_id`), the business action taxonomy (`action_type`), and a typed target reference (`target_entity_type` + `target_entity_id`).
   *
   * For correct tenant isolation, the implementation must verify that the target record belongs to the currently selected organization context via `erp_hrm_time_tracking_activity_log_entries.organization_id`. If the record is not in the selected organization, the system must reject the request as not found or access denied according to the platform’s standard error mapping.
   *
   * This operation does not require any request body. The only input is the path parameter `activityLogEntryId`, which maps to `erp_hrm_time_tracking_activity_log_entries.id`.
   *
   * Error handling:
   * - If no entry exists with the given `activityLogEntryId` within the selected organization, the operation fails with the standard not-found behavior.
   * - If the caller lacks permission to perform audit entry removal, the operation fails with the standard authorization error.
   *
   * Related operations:
   * - Retrieval endpoints for activity log entries (e.g., an “index”/search list or “at” detail) can be used prior to deletion to confirm the correct entry ID.
   * - Other project lifecycle operations (create/archive/complete/delete) may create activity log entries; if a lifecycle action is rejected, the system must avoid recording misleading success entries in the activity log, so removal may be used to clean up entries only when a real record exists.
   *
   * @param connection
   * @param activityLogEntryId Target activity log entry ID to remove.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implementation steps for Realize Agent:
   *
   * 1. Parse `activityLogEntryId` from path and resolve it to `erp_hrm_time_tracking_activity_log_entries.id`.
   * 2. Resolve caller’s selected organization context (tenant) and enforce tenant isolation by checking `erp_hrm_time_tracking_activity_log_entries.organization_id` equals the selected organization id.
   * 3. Authorization:
   *    - Enforce that the caller has the capability/role required to remove audit entries (implementation must follow the project’s permission model; do not allow regular members to remove audit data unless explicitly permitted).
   * 4. Load the activity log entry by (id) within the selected organization.
   *    - If not found, throw the standard “not found”/“unavailable” error.
   * 5. Perform the removal:
   *    - If the system’s retention policy requires logical removal, set `deleted_at` to current timestamp.
   *    - Otherwise, remove the row permanently (implementation must follow the platform retention policy configuration; do not introduce additional columns not present in the schema).
   * 6. Return `null` response body with HTTP 200/204 according to the platform convention for delete.
   * 7. Do not create any misleading new activity log entry for this action unless the platform requires audit of audit removal; if audit is required, record it as a distinct action_type in the same organization scope.
   *
   * Database access:
   * - Use a single transaction for the read + delete/update of `erp_hrm_time_tracking_activity_log_entries`.
   * - Ensure indexes used: `id` lookup by primary key and organization filter by `organization_id` (and optionally `deleted_at` handling if retention uses logical deletion).
   *
   * Edge cases:
   * - Concurrent deletions: if the record is already deleted/removed, treat as not found for consistency.
   * - Deleted records handling: if `deleted_at` is used, define whether deletion updates `deleted_at` only when currently null.
   *
   * Field mappings:
   * - `activityLogEntryId` -> `erp_hrm_time_tracking_activity_log_entries.id`.
   * - Tenant validation -> `erp_hrm_time_tracking_activity_log_entries.organization_id`.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":activityLogEntryId")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("activityLogEntryId")
    activityLogEntryId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteErpHrmTimeTrackingMemberActivityLogEntriesActivityLogEntryId(
        {
          member,
          activityLogEntryId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
