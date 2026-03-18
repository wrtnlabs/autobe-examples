import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IHrmTimeTrackingActivityLog } from "../../../api/structures/IHrmTimeTrackingActivityLog";
import { IPageIHrmTimeTrackingActivityLog } from "../../../api/structures/IPageIHrmTimeTrackingActivityLog";
import { getHrmTimeTrackingActivityLogsActivityLogId } from "../../../providers/getHrmTimeTrackingActivityLogsActivityLogId";
import { patchHrmTimeTrackingActivityLogs } from "../../../providers/patchHrmTimeTrackingActivityLogs";

@Controller("/hrmTimeTracking/activityLogs")
export class HrmtimetrackingActivitylogsController {
  /**
   * Retrieve a filtered and paginated list of organization activity log entries.
   *
   * This operation provides the organization history view for significant business actions recorded by the hrm time tracking platform. It returns business-readable audit records from the organization-scoped hrm_time_tracking_activity_logs table, which stores the authenticated actor category, the business action classification, the affected target entity type, the optional target entity identifier, the human-readable detail text, and the timestamp when the audited action occurred. The endpoint is intended for review workflows where authorized users need to understand what happened in the organization over time, including employee invitation events, employee activation changes, contract changes, project lifecycle changes, and task status changes.
   *
   * Access to this operation must be evaluated within the currently selected organization context. The requirements state that role-based access is organization-scoped, so permissions from another organization must not grant visibility here. Only authorized organization members should be allowed to review these records, and the response must contain only entries belonging to the current organization. This preserves tenant isolation for users who belong to multiple organizations and ensures that activity history remains a workspace-specific business record.
   *
   * The response is optimized for browsing and investigation rather than raw table inspection. Consumers can request pagination, sorting, date filtering, actor-type filtering, action-type filtering, target-entity filtering, target-entity-id filtering, and keyword search over the details field so they can locate meaningful entries quickly. This aligns with the requirement that activity log entries be presented as business-readable records and with the database design that indexes organization-and-time, organization-and-action, and organization-and-target access paths for efficient filtered retrieval.
   *
   * Each returned entry represents a significant action already completed elsewhere in the system and then recorded into the activity log. For project lifecycle events, the log captures project created, archived, completed, and deleted actions. For employee and contract administration, it captures employee invited, employee deactivated, employee reactivated, contract created, and contract edited actions. Related management APIs must complete their own business validation first; this endpoint is the read side used afterward to review the historical record they produced.
   *
   * Actor attribution is modeled through normalized subtype tables linked from the parent activity log record. When the actor_type indicates owner, manager, or employee, the system should resolve the matching actor branch from hrm_time_tracking_activity_log_of_owners, hrm_time_tracking_activity_log_of_managers, or hrm_time_tracking_activity_log_of_employees so the response can provide consistent actor information without exposing the internal polymorphic storage pattern directly. Logically removed records should not be shown in normal browsing results.
   *
   * If invalid filter values are supplied, the request should be rejected clearly rather than silently ignored. If authorization fails, the operation must deny access for the current organization context. If dependent display enrichment cannot be resolved consistently, the system should fail safely without leaking another organization's data. Because this endpoint only reads persisted organization history, it must not create, modify, or remove activity log records during execution.
   *
   * @param connection
   * @param body Activity log search filters and pagination options
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Implement a search/list service over hrm_time_tracking_activity_logs scoped strictly to the caller's currently selected organization.
   *
   * 1. Resolve the authenticated principal and current organization context before executing any query. Authorize only users allowed to review organization activity in that organization. Apply organization-scoped permission evaluation exactly as required so permissions from another organization are ignored.
   *
   * 2. Build the base query from hrm_time_tracking_activity_logs where hrm_time_tracking_organization_id equals the current organization id and deleted_at is null. Never accept organization id from the request body for scoping because tenant context must come from authentication and current workspace selection.
   *
   * 3. Apply optional request filters from IHrmTimeTrackingActivityLog.IRequest, including actor type, action type, target entity, target entity id, created-at range, and free-text keyword search on details. Keyword matching should be case-insensitive and use the trigram-backed details index when available. If the request supports multiple values per category, translate them to IN predicates. Reject malformed enum-like values or invalid date range combinations.
   *
   * 4. Apply sorting with a default of created_at descending so the most recent activity appears first. Allow only a safe whitelist of sortable fields, preferably created_at and possibly action_type or target_entity if defined in the request DTO contract. Normalize invalid sort requests to a validation error instead of unsafe dynamic SQL.
   *
   * 5. Execute paginated retrieval and total-count logic according to the platform pagination convention used by IPageIHrmTimeTrackingActivityLog.ISummary. Return summary records, not raw subtype rows.
   *
   * 6. Enrich each activity log row with actor information by resolving exactly one normalized actor branch according to actor_type: hrm_time_tracking_activity_log_of_owners joined to hrm_time_tracking_owners, hrm_time_tracking_activity_log_of_managers joined to hrm_time_tracking_managers, or hrm_time_tracking_activity_log_of_employees joined to hrm_time_tracking_employees. Treat missing or contradictory subtype linkage as a data integrity error for that record and handle it safely.
   *
   * 7. Map each result into IHrmTimeTrackingActivityLog.ISummary using only fields actually supported by the entity schema and resolved relations. Include the timestamp, actor classification, action classification, target entity classification, optional target entity id, details, and any actor summary fields defined by the DTO schema. Do not expose deleted_at in normal summary output unless the DTO explicitly includes it.
   *
   * 8. Error handling: return authorization failure when the caller lacks access; return validation failure for unsupported filters or invalid pagination; return not found only if the organization context itself is invalid; and preserve tenant isolation in all failures. As this is a read-only operation, do not write activity logs or mutate related records during execution.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @TypedBody()
    body: IHrmTimeTrackingActivityLog.IRequest,
  ): Promise<IPageIHrmTimeTrackingActivityLog.ISummary> {
    try {
      return await patchHrmTimeTrackingActivityLogs({
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single activity log entry from the current organization's business-visible history of significant actions.
   *
   * This operation returns one detailed audit record from the organization-scoped activity log maintained in the hrmTimeTracking platform. The underlying activity log entity is an append-oriented operational history record that captures meaningful actions rather than every minor interaction. In the database, the record is stored in `hrm_time_tracking_activity_logs`, which identifies the owning organization, the actor category in `actor_type`, the business action classification in `action_type`, the affected business entity in `target_entity`, the optional affected record identifier in `target_entity_id`, optional human-readable `details`, and the event timestamp in `created_at`. This endpoint is intended for reviewing what happened, when it happened, who performed it, and what business record was affected.
   *
   * Access to this operation is organization-scoped and permission-gated. The requirements state that the activity log belongs to one organization context only, and users must never see entries from another organization while working in the current one. Accordingly, the requested `activityLogId` must resolve to an activity log row whose `hrm_time_tracking_organization_id` matches the caller's current organization context. In addition, full activity log retrieval is reserved for users with organization management permission in that current organization. Possessing access in another organization must not grant visibility here.
   *
   * The actor attribution for an activity log is normalized rather than denormalized. While the main record stores `actor_type`, the actual actor linkage is resolved through one of the subtype tables `hrm_time_tracking_activity_log_of_owners`, `hrm_time_tracking_activity_log_of_managers`, or `hrm_time_tracking_activity_log_of_employees`. Consumers should expect a unified response DTO, but implementers must understand that the visible acting user information may come from different ownership branches depending on whether the significant action was performed by an owner, manager, or employee account.
   *
   * This operation is read-only and should be used together with the activity log list operation when users first browse the organization history and then open a specific entry for deeper inspection. Typical entries include project created, project archived, project completed, project deleted, task status changed, employee invited, employee deactivated, employee reactivated, contract created, and contract edited actions. If the requested identifier does not belong to an accessible activity log record in the current organization, the operation must fail rather than exposing whether a record exists in another organization.
   *
   * @param connection
   * @param activityLogId Unique identifier of the activity log entry in the current organization
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor null
   * @x-autobe-specification Load one record from `hrm_time_tracking_activity_logs` by primary key `id` and enforce organization scoping before returning any data.
   *
   * Implementation steps:
   * 1. Resolve the caller's current organization context and effective permissions for that organization.
   * 2. Verify that the caller has organization management permission in the current organization. Reject the request if the permission is absent, even if the same user has broader access in another organization.
   * 3. Query `hrm_time_tracking_activity_logs` by `id = :activityLogId` and `deleted_at IS NULL` if active browsing excludes logically removed rows.
   * 4. Enforce `hrm_time_tracking_organization_id = :currentOrganizationId`. If no matching row exists under the current organization, return a not-found style failure rather than leaking cross-organization existence.
   * 5. Resolve actor attribution according to `actor_type`:
   *    - if owner, load the related row from `hrm_time_tracking_activity_log_of_owners` and join the corresponding owner account;
   *    - if manager, load the related row from `hrm_time_tracking_activity_log_of_managers` and join the corresponding manager account;
   *    - if employee, load the related row from `hrm_time_tracking_activity_log_of_employees` and join the corresponding employee account.
   * 6. Map the record into `IHrmTimeTrackingActivityLog`, including the business-readable fields required by the requirements: timestamp, acting user, action type, target entity, optional target entity identifier, and details.
   *
   * Validation and behavior rules:
   * - Treat the endpoint as read-only; no mutation side effects are allowed.
   * - Do not synthesize actor data if the subtype link is missing unexpectedly. Handle this as a data integrity failure or internal error according to service conventions.
   * - Preserve organization isolation at every step, including error handling.
   * - Return a not-found result when the identifier is unknown within the current organization scope.
   * - The operation does not invoke external integrations; if surrounding middleware or enrichers do, any failure must not create or alter business records during this read path.
   *
   * Query considerations:
   * - Prefer a single detail query on the main activity log row plus targeted subtype resolution based on `actor_type`.
   * - The primary lookup is by UUID primary key, while the organization ownership field provides the scope check.
   * - The response should expose the event as a detailed record suitable for audit review screens and drill-down views from the paginated activity log list.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":activityLogId")
  public async at(
    @TypedParam("activityLogId")
    activityLogId: string & tags.Format<"uuid">,
  ): Promise<IHrmTimeTrackingActivityLog> {
    try {
      return await getHrmTimeTrackingActivityLogsActivityLogId({
        activityLogId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
