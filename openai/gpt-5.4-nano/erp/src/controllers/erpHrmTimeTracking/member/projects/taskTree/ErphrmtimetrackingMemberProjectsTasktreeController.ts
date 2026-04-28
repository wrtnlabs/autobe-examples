import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IErpHrmTimeTrackingTask } from "../../../../../api/structures/IErpHrmTimeTrackingTask";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { patchErpHrmTimeTrackingMemberProjectsProjectIdTaskTree } from "../../../../../providers/patchErpHrmTimeTrackingMemberProjectsProjectIdTaskTree";

@Controller("/erpHrmTimeTracking/member/projects/:projectId/taskTree")
export class ErphrmtimetrackingMemberProjectsTasktreeController {
  /**
   * Builds a hierarchical task tree for a specific project, returning tasks arranged according to the one-level nesting model stored in `erp_hrm_time_tracking_tasks`.
   *
   * This endpoint targets `erp_hrm_time_tracking_tasks`, where every task has a required `erp_hrm_time_tracking_project_id` and an optional `parent_task_id`. The service must interpret `parent_task_id` to produce the tree structure: root nodes are tasks whose `parent_task_id` is null, and child nodes are tasks whose `parent_task_id` matches a root task. Because the domain model supports only one level of nesting, the response must not create deeper levels than root → child.
   *
   * For security and correctness, the operation must enforce organization scoping: the targeted project (`erp_hrm_time_tracking_projects`) must belong to the currently selected organization context. If a user attempts to access a project outside the selected organization, the system must deny the operation.
   *
   * Authorization is enforced based on project membership and role. The system must ensure the caller is a member of the target project via `erp_hrm_time_tracking_project_memberships`, and apply the caller’s effective capability: project-managers with manage capability can manage tasks, while other authorized project members can view tasks in their assigned projects.
   *
   * Validation rules: the `projectId` path parameter must refer to an existing, non-deleted project record (`erp_hrm_time_tracking_projects.deleted_at` is null). Returned tasks must exclude deleted task records (`erp_hrm_time_tracking_tasks.deleted_at` is null). The endpoint must also include task metadata required by the UI, including `title`, `status`, `priority`, and optional planning fields such as `estimated_hours` and `due_date`.
   *
   * For performance and UI responsiveness, fetch all candidate tasks for the project in one query (filtered by `erp_hrm_time_tracking_project_id` and `deleted_at`) and assemble the one-level tree in memory.
   *
   * @param connection
   * @param projectId Target project identifier within the selected organization context.
   * @param body Task tree build options such as filtering by task status/priority, sorting, and any other criteria supported by the task-tree request DTO. The implementation must apply these options to tasks of the specified project before assembling the one-level hierarchy.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implementation steps: 1) Authorization & scoping
     *   - Resolve the caller’s selected organization context. - Load
     *   `erp_hrm_time_tracking_projects` by `id = projectId` and require
     *   `deleted_at IS NULL`. - Require `erp_hrm_time_tracking_project_id.
     *   erp_hrm_time_tracking_organization_id = selectedOrganizationId`;
     *   otherwise return 404 (or equivalent not-found) to avoid information
     *   leakage. - Verify membership in
     *   `erp_hrm_time_tracking_project_memberships` for the caller’s employee
     *   representation within the same organization; require `deleted_at IS
     *   NULL`. - Apply role-based capability rules for viewing task tree. 2)
     *   Input handling (from request body) - Parse tree options (when present):
     *   sorting (e.g., by `created_at` then `title`), status filtering (matches
     *   `erp_hrm_time_tracking_tasks.status`), priority filtering (matches
     *   `erp_hrm_time_tracking_tasks.priority`), and any optional text matching
     *   if defined by the request DTO. 3) Data retrieval - Query
     *   `erp_hrm_time_tracking_tasks` for the project:
     *   `erp_hrm_time_tracking_project_id = project.id` and `deleted_at IS
     *   NULL`. - Apply request filters/sorting at SQL level when feasible;
     *   otherwise apply after fetch but before tree assembly. 4) Tree assembly
     *   (one-level) - Separate tasks into roots where `parent_task_id IS NULL`
     *   and children where `parent_task_id IN rootIds`. - For each root, attach
     *   children whose `parent_task_id = root.id`. - Do not create
     *   grandchildren (ignore any deeper structure by construction because only
     *   one-level is represented by the tree response). 5) Response mapping -
     *   Map task rows into tree node DTO fields: `id`, `title`, `status`,
     *   `priority`, `description` (if present in DTO), `estimated_hours` (if
     *   present), `due_date` (if present), `parent_task_id` (if present), and
     *   timestamps (if present in DTO). - Return the tree container DTO. 6)
     *   Error handling - If project is not found in the selected organization:
     *   404. - If caller has no valid project membership: 403. - If request
     *   options are invalid: 400. 7) Transactions - Read-only operation; no
     *   write transaction required.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async buildTaskTree(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("projectId")
    projectId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmTimeTrackingTask.IRequest,
  ): Promise<IErpHrmTimeTrackingTask> {
    try {
      return await patchErpHrmTimeTrackingMemberProjectsProjectIdTaskTree({
        member,
        projectId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
