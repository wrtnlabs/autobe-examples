import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IErpHrmActivityLog } from "../../../../../api/structures/IErpHrmActivityLog";
import { IPageIErpHrmActivityLog } from "../../../../../api/structures/IPageIErpHrmActivityLog";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { getErpHrmMemberOrganizationsOrganizationIdActivityLogsActivityLogId } from "../../../../../providers/getErpHrmMemberOrganizationsOrganizationIdActivityLogsActivityLogId";
import { getErpHrmMemberOrganizationsOrganizationIdActivityLogsStatistics } from "../../../../../providers/getErpHrmMemberOrganizationsOrganizationIdActivityLogsStatistics";
import { patchErpHrmMemberOrganizationsOrganizationIdActivityLogs } from "../../../../../providers/patchErpHrmMemberOrganizationsOrganizationIdActivityLogs";

@Controller("/erpHrm/member/organizations/:organizationId/activity-logs")
export class ErphrmMemberOrganizationsActivity_logsController {
  /**
   * Retrieve a filtered and paginated list of activity logs for an organization.
   *
   * This endpoint provides access to the organization-level activity audit trail, which records significant actions performed by users within the organization. Each log entry contains information about what action occurred, who performed it, when it happened, and what entity was affected.
   *
   * The activity log supports filtering by action type to narrow down logs to specific categories such as employee management events (invited, deactivated, reactivated), contract lifecycle events (created, edited), project lifecycle events (created, archived, completed, deleted), task status changes, timesheet workflow events (submitted, approved, rejected), and role assignments.
   *
   * Filtering by member allows administrators to review all actions performed by a specific employee. Date range filtering enables investigation of actions that occurred within a specific time period.
   *
   * Results are returned in reverse chronological order by default, with the most recent entries appearing first. The response includes a summary view of each activity log entry optimized for list displays, with full details available through the activity log detail endpoint.
   *
   * **Security**: Access to this endpoint requires the organization manage permission (org:manage) within the current organization context. Users without this permission will receive an access denied error. Additionally, strict organization isolation is enforced - users can only access activity logs for organizations where they possess the organization manage permission.
   *
   * **Organization Scoping**: All activity log queries are automatically filtered by the organization context. The {organizationId} path parameter specifies which organization's activity logs to retrieve. Users belonging to multiple organizations must ensure they have the correct organization context selected before accessing this endpoint.
   *
   * **Relationship to Database**: This operation queries the erp_hrm_activity_logs table, which stores log entries with references to erp_hrm_organizations and erp_hrm_members tables. Logs are append-only and cannot be modified or deleted through API operations.
   *
   * @param connection
   * @param organizationId UUID of the organization whose activity logs to retrieve
   * @param body Search criteria including filters for action type, member, date range, and pagination parameters
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Query the erp_hrm_activity_logs table with the following implementation steps:
   *
   * 1. **Authorization Check**: Verify the authenticated user has org:manage permission in the current organization context. If the user does not have permission, return an access denied error (HTTP 403).
   *
   * 2. **Organization Context Validation**: Ensure the {organizationId} path parameter matches the user's current organization context. If not, return an access denied error due to organization isolation enforcement.
   *
   * 3. **Build Query Filters**: Apply the following filters from the request body:
   *    - action_type: Filter by specific action category (e.g., employee_invited, project_created, timesheet_submitted)
   *    - member_id: Filter by the member who performed the action
   *    - date_range: Filter by created_at timestamp within start and end dates
   *    - Pagination parameters: page, limit, order_by, sort_order
   *
   * 4. **Default Sorting**: Order results by created_at in descending order (most recent first).
   *
   * 5. **Execute Query with Joins**: Join erp_hrm_activity_logs with erp_hrm_members table to include member information in the results.
   *
   * 6. **Return Paginated Results**: Return a paginated response containing:
   *    - Pagination metadata (total count, current page, page size, total pages)
   *    - Array of activity log summaries with: id, action_type, target_entity_type, target_entity_id, member info, created_at, and truncated details if applicable
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmActivityLog.IRequest,
  ): Promise<IPageIErpHrmActivityLog.ISummary> {
    try {
      return await patchErpHrmMemberOrganizationsOrganizationIdActivityLogs({
        member,
        organizationId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a specific activity log entry from an organization.
   *
   * This endpoint retrieves a single activity log record identified by its unique identifier within the context of a specific organization. The activity log entry provides a complete record of a significant action performed within the organization, including who performed it, what action was taken, what entity was affected, and when it occurred.
   *
   * The response includes the complete activity log entry with all associated metadata such as the action type, target entity information, additional details in JSON format, and the timestamp of when the action occurred.
   *
   * This operation requires the caller to have organization management permission within the current organization context. The activity log entry is scoped exclusively to its organization and cannot be accessed by users from other organizations, ensuring complete data isolation between tenants.
   *
   * The retrieved activity log entry is immutable - once recorded, it cannot be modified or deleted through any API operation.
   *
   * Related operations include the list endpoint for retrieving filtered and paginated activity logs, and the organization endpoint for managing organization settings.
   *
   * @param connection
   * @param organizationId The unique identifier of the organization (global scope)
   * @param activityLogId The unique identifier of the activity log entry
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1. Validate that organizationId matches a valid organization in erp_hrm_organizations table
   * 2. Validate that activityLogId matches a valid activity log in erp_hrm_activity_logs table
   * 3. Verify the activity log belongs to the specified organization (join erp_hrm_activity_logs.erp_hrm_organization_id with erp_hrm_organizations.id)
   * 4. Verify the authenticated member has org:manage permission in the organization context
   * 5. If validation fails, return appropriate error response
   * 6. Return the full activity log entry including all fields: id, organization_id, member_id, action_type, target_entity_type, target_entity_id, details, created_at
   * 7. Join with erp_hrm_members table to include member information (name, email) in the response if available
   * 8. Parse the details JSON field for proper response formatting
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":activityLogId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedParam("activityLogId")
    activityLogId: string & tags.Format<"uuid">,
  ): Promise<IErpHrmActivityLog> {
    try {
      return await getErpHrmMemberOrganizationsOrganizationIdActivityLogsActivityLogId(
        {
          member,
          organizationId,
          activityLogId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve aggregated statistics about activity log entries for an organization.
   *
   * This endpoint provides comprehensive statistical insights into organizational activity based on recorded audit trail entries in the erp_hrm_activity_logs table. Administrators can use these statistics to understand user engagement patterns, identify activity trends, and monitor organizational health.
   *
   * The response includes total counts, breakdowns by action_type (such as employee_invited, employee_deactivated, project_created, timesheet_submitted, etc.), temporal distribution showing activity counts by day or week, and the most active users ranked by their contribution to the activity log.
   *
   * Security: Access requires the organization manage permission within the current organization context. Users without this permission will receive an access denied error. The organizationId must reference an organization to which the authenticated user belongs.
   *
   * The activity log records significant actions including employee management events (invited, deactivated, reactivated), contract lifecycle (created, edited), project lifecycle (created, archived, completed, deleted), task status changes, timesheet workflow (submitted, approved, rejected), and role assignments.
   *
   * Related operations: Use GET /organizations/{organizationId}/activity-logs for paginated raw activity log entries with filtering capabilities.
   *
   * @param connection
   * @param organizationId Unique identifier of the organization whose activity log statistics to retrieve (global scope).
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implement the statistics aggregation service logic:
   *
   * 1. Authorization Check: Verify the authenticated member has org:manage permission in the specified organization context.
   *
   * 2. Organization Validation: Confirm the organizationId exists in erp_hrm_organizations table.
   *
   * 3. Query erp_hrm_activity_logs table with erp_hrm_organization_id filter equal to the path parameter.
   *
   * 4. Compute the following aggregations from the filtered activity logs:
   *    - total_entries: COUNT of all matching activity log entries
   *    - by_action_type: GROUP BY action_type returning count per category
   *    - by_date: GROUP BY DATE(created_at) returning daily counts
   *    - top_users: GROUP BY erp_hrm_member_id with count, ordered by count DESC, limited to top 10
   *    - entity_type_distribution: GROUP BY target_entity_type returning counts
   *
   * 5. Return computed statistics in IErpHrmActivityLogStatistics response structure.
   *
   * Edge Cases:
   * - Empty organization (no activity logs): Return zero counts for all aggregation categories
   * - Invalid organizationId: Return 404 Not Found error
   * - Missing organization context: Return 400 Bad Request error
   * - Unauthorized access: Return 403 Forbidden error
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get("statistics")
  public async statistics(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
  ): Promise<IErpHrmActivityLog> {
    try {
      return await getErpHrmMemberOrganizationsOrganizationIdActivityLogsStatistics(
        {
          member,
          organizationId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
