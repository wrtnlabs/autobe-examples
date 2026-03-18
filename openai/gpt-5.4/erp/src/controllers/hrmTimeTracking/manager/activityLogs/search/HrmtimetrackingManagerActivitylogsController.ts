import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia from "typia";

import { IHrmTimeTrackingActivityLog } from "../../../../../api/structures/IHrmTimeTrackingActivityLog";
import { IPageIHrmTimeTrackingActivityLog } from "../../../../../api/structures/IPageIHrmTimeTrackingActivityLog";
import { ManagerAuth } from "../../../../../decorators/ManagerAuth";
import { ManagerPayload } from "../../../../../decorators/payload/ManagerPayload";
import { patchHrmTimeTrackingManagerActivityLogsSearch } from "../../../../../providers/patchHrmTimeTrackingManagerActivityLogsSearch";

@Controller("/hrmTimeTracking/manager/activityLogs/search")
export class HrmtimetrackingManagerActivitylogsController {
  /**
   * Search the organization activity log using paginated and filterable criteria.
   *
   * This operation retrieves activity log entries that belong to the currently selected organization and returns them as a paginated result set. The underlying `hrm_time_tracking_activity_logs` table is the organization-scoped audit trail for significant business actions, including employee invitation and status changes, contract changes, project lifecycle events, task status changes, timesheet review events, and role-related actions. Each entry stores the authenticated actor category in `actor_type`, the business action classification in `action_type`, the affected business area in `target_entity`, the optional affected record identifier in `target_entity_id`, optional human-readable `details`, and the `created_at` timestamp that represents when the audited action occurred.
   *
   * Access to this operation is restricted by organization context and permission. The loaded business rules require that only users with organization management permission may retrieve the full activity log for the current organization. The operation must therefore evaluate authorization within the selected organization only, and must never use permissions from another organization to grant access. If the caller does not have the required permission in the active organization context, the request must be denied. If the caller does have permission, the result set must still remain strictly limited to entries owned by that same organization.
   *
   * The search request is intended for complex browsing scenarios. It should support filtering by action type, filtering by acting user, and filtering by date range, together with paginated browsing for long audit histories. When a requested filter value does not match any stored activity log data, the operation should return an empty page rather than altering or relaxing the filter. When the requested page is beyond the available matching results, the operation should also return an empty result set for that page. These rules ensure predictable browsing behavior for administrative audit review screens and historical investigations.
   *
   * Although the main activity log record stores the generic actor category, the concrete actor identity is normalized through `hrm_time_tracking_activity_log_of_owners`, `hrm_time_tracking_activity_log_of_managers`, and `hrm_time_tracking_activity_log_of_employees`. Implementations may use these subtype relations to resolve the acting user filter and to populate actor display information in the returned summary objects. This operation is commonly used after business actions have already occurred through other APIs, such as employee invitation management, employee contract management, project lifecycle updates, or task status changes, because those operations generate the entries that are later reviewed here.
   *
   * If any relevant upstream business action was rejected and no activity record was created, this operation will not surface a corresponding entry. Likewise, organization isolation must be preserved during all filtering and paging behavior so that users who belong to multiple organizations only see the audit history for their currently selected workspace.
   *
   * @param connection
   * @param body Activity log search filters and pagination options
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor manager
   * @x-autobe-specification Implement a read-only search service over `hrm_time_tracking_activity_logs` scoped to the authenticated user's current organization.
   *
   * 1. Resolve the caller's active organization context from authentication/session state, not from the request body.
   * 2. Authorize the caller by checking organization management permission within that organization context. Do not consider permissions from other organizations. Reject unauthorized requests before querying data.
   * 3. Build the base query on `hrm_time_tracking_activity_logs` filtered by `hrm_time_tracking_organization_id` equal to the current organization and excluding logically removed records when active browsing should not include rows with `deleted_at` set.
   * 4. Apply optional request filters:
   *    - `actionType`: exact match against `action_type`.
   *    - `actor`: resolve against the normalized actor subtype tables and matching actor identifiers supported by the request DTO, while preserving organization scope.
   *    - `dateRange`: constrain `created_at` by inclusive start/end boundaries.
   *    - Optional free-text or target filters may search `details` or `target_entity` only if they are part of the DTO definition.
   * 5. Apply deterministic sorting, defaulting to newest first by `created_at` and secondarily by `id` for stable pagination.
   * 6. Execute paginated retrieval and return a page container of activity log summaries. If the requested page is beyond available results, return an empty `data` array with pagination metadata instead of failing.
   * 7. For each returned entry, map summary data from the activity log row and, when required by the DTO, join the appropriate actor subtype table to expose actor identity/display information. Use left joins so rows remain retrievable even if only one ownership branch applies.
   * 8. Preserve append-oriented audit semantics: this operation must never create, modify, or remove activity log records.
   * 9. Error handling:
   *    - Reject unauthorized access.
   *    - Return successful empty results for unmatched filters.
   *    - Keep all failures scoped to the current organization context.
   * 10. Performance considerations: use the existing indexes on `(hrm_time_tracking_organization_id, created_at)`, `(hrm_time_tracking_organization_id, action_type, created_at)`, and `(hrm_time_tracking_organization_id, target_entity, created_at)` to support organization-scoped browsing and action-type filtering efficiently.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async search(
    @ManagerAuth()
    manager: ManagerPayload,
    @TypedBody()
    body: IHrmTimeTrackingActivityLog.IRequest,
  ): Promise<IPageIHrmTimeTrackingActivityLog.ISummary> {
    try {
      return await patchHrmTimeTrackingManagerActivityLogsSearch({
        manager,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
