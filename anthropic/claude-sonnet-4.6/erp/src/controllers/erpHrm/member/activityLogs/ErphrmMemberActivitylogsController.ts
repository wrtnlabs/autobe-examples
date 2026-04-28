import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IErpHrmActivityLog } from "../../../../api/structures/IErpHrmActivityLog";
import { IPageIErpHrmActivityLog } from "../../../../api/structures/IPageIErpHrmActivityLog";
import { MemberAuth } from "../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../decorators/payload/MemberPayload";
import { getErpHrmMemberActivityLogsActivityLogId } from "../../../../providers/getErpHrmMemberActivityLogsActivityLogId";
import { patchErpHrmMemberActivityLogs } from "../../../../providers/patchErpHrmMemberActivityLogs";

@Controller("/erpHrm/member/activityLogs")
export class ErphrmMemberActivitylogsController {
  /**
   * Retrieve a filtered and paginated list of organizational activity log entries.
   *
   * Activity logs are immutable audit trail records that the system automatically generates whenever significant business events occur within an organization. This operation allows authorized organization members to browse, search, and filter through the complete chronological history of actions performed in their organization.
   *
   * Each activity log entry in the erp_hrm_activity_logs table captures: the exact timestamp of the action, the organization member who performed it, a categorized action_type drawn from a fixed set of recognized business event codes (such as 'employee_invited', 'employee_deactivated', 'contract_created', 'project_archived', 'task_status_changed', 'timesheet_submitted', 'timesheet_approved', 'timesheet_rejected', 'role_assigned_or_changed', and others), the type and ID of the target entity affected, and optional supplementary details.
   *
   * The organization scope is automatically determined from the authenticated member's current session context. All returned entries belong exclusively to the member's current organization, enforcing strict data isolation between organizations. Members must hold appropriate audit log viewing permissions within their organization role to access this endpoint.
   *
   * This operation supports a rich set of filtering capabilities including filtering by one or more action_type values, by target_entity_type (e.g., 'member', 'contract', 'project', 'task', 'timesheet', 'role'), by the specific target_entity_id, by the performing organization_member_id, and by a created_at date/time range. Pagination and sorting are also supported, with results typically ordered by created_at descending so the most recent events appear first.
   *
   * Activity log entries are permanently preserved for the lifetime of the organization and are never purged or overwritten. They cannot be created, modified, or deleted through any user-facing operation — this endpoint provides read access only. Refer to the ActivityLog business rules for the complete list of loggable action types and the entities they target.
   *
   * @param connection
   * @param body Search criteria and pagination parameters for filtering activity log entries
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification 1. Authenticate the requesting member and resolve
     *   their current organization_id from the session context. 2. Verify that
     *   the member's role grants permission to view the organization's activity
     *   log (audit log viewing permission). 3. Accept
     *   IErpHrmActivityLog.IRequest in the request body, which includes
     *   optional filters: - action_type: string[] (filter by one or more action
     *   type codes) - target_entity_type: string[] (filter by entity type,
     *   e.g., 'member', 'contract', 'project', 'task', 'timesheet', 'role') -
     *   target_entity_id: string (UUID, filter by specific target entity) -
     *   organization_member_id: string (UUID, filter by performer) -
     *   created_at_from: DateTime (inclusive lower bound) - created_at_to:
     *   DateTime (inclusive upper bound) - pagination: { page, limit } for
     *   offset-based pagination - sort: { field, direction } for sorting
     *   (default: created_at DESC) 4. Build a query against
     *   erp_hrm_activity_logs filtered by organization_id from session
     *   (mandatory), plus any provided optional filters. Use the
   *   @@index([organization_id, created_at]) and @@index([organization_id,
   *   action_type]) indexes for efficiency. 5. Join
   *   erp_hrm_organization_members to resolve the performer's display name/ID
   *   for the summary response. 6. Return total count and the page of entries
   *   as IPageIErpHrmActivityLog.ISummary. 7. Each summary item includes: id,
   *   action_type, target_entity_type, target_entity_id,
   *   organization_member_id (and brief performer info), details (nullable),
   *   created_at. 8. Edge cases: if no entries match the filter, return empty
   *   data array with correct pagination metadata. If a filter references a
   *   non-existent member_id or entity_id, return empty results (not an
   *   error).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IErpHrmActivityLog.IRequest,
  ): Promise<IPageIErpHrmActivityLog.ISummary> {
    try {
      return await patchErpHrmMemberActivityLogs({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single activity log entry by its unique identifier.
   *
   * This operation returns the full detail of one immutable organizational audit trail entry from the `erp_hrm_activity_logs` table. Each activity log entry is created automatically by the system whenever a qualifying business event occurs within an organization, and once recorded the entry can never be edited or deleted. The entry includes the exact timestamp the action occurred, the organization member who performed it, the categorized action type (one of a fixed set such as `employee_invited`, `employee_deactivated`, `employee_reactivated`, `contract_created`, `contract_edited`, `project_created`, `project_archived`, `project_completed`, `project_deleted`, `task_status_changed`, `timesheet_submitted`, `timesheet_approved`, `timesheet_rejected`, `role_assigned_or_changed`), the type and UUID of the affected entity (`target_entity_type` and `target_entity_id`), and any optional supplementary `details` context.
   *
   * Access to this endpoint is restricted to authenticated members who hold the organization management permission (`org:manage`) within the organization that owns the requested log entry. The activity log is strictly scoped to a single organization; a member from a different organization cannot view entries belonging to another organization.
   *
   * This endpoint is complementary to the paginated activity log list operation (`PATCH /activityLogs`), which supports filtering by action type, performer, and date range. Use this endpoint to retrieve the full detail of a specific entry identified from the list — for example, to inspect the `details` field of a particular contract edit or role assignment event.
   *
   * Because activity log entries are permanently immutable (`erp_hrm_activity_logs` has no `updated_at` or `deleted_at` columns), the response for a given `activityLogId` will always be identical across repeated calls as long as the record exists.
   *
   * @param connection
   * @param activityLogId The UUID of the target activity log entry to retrieve.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification 1. Authenticate the requesting member and resolve
     *   the current organization context from the session. 2. Verify the member
     *   has the `org:manage` permission within the current organization. 3.
     *   Query `erp_hrm_activity_logs` by the given `activityLogId` (UUID
     *   primary key). 4. Verify the retrieved entry's `organization_id` matches
     *   the authenticated member's current organization. If not, return 403
     *   Forbidden (cross-organization access denial). 5. If no entry is found
     *   for the given UUID, return 404 Not Found. 6. Join or hydrate the
     *   `organization_member_id` to include identifying details of the
     *   performer (e.g., name, email) for the response DTO. 7. Return the full
     *   activity log entry as `IErpHrmActivityLog`, including: id,
     *   organization_id, organization_member_id (with performer summary),
     *   action_type, target_entity_type, target_entity_id, details (nullable),
     *   and created_at. 8. No write operations are performed; this is a pure
     *   read-only query.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":activityLogId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("activityLogId")
    activityLogId: string & tags.Format<"uuid">,
  ): Promise<IErpHrmActivityLog> {
    try {
      return await getErpHrmMemberActivityLogsActivityLogId({
        member,
        activityLogId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
