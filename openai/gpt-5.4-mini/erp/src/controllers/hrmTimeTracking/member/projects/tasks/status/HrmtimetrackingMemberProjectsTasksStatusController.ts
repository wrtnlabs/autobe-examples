import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IHrmTimeTrackingTask } from "../../../../../../api/structures/IHrmTimeTrackingTask";
import { MemberAuth } from "../../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../../decorators/payload/MemberPayload";
import { patchHrmTimeTrackingMemberProjectsProjectIdTasksTaskIdStatus } from "../../../../../../providers/patchHrmTimeTrackingMemberProjectsProjectIdTasksTaskIdStatus";

@Controller("/hrmTimeTracking/member/projects/:projectId/tasks/:taskId/status")
export class HrmtimetrackingMemberProjectsTasksStatusController {
  /**
   * Update the workflow status of a task that belongs to a specific project.
   *
   * This operation changes the current task status stored in the task record and records the transition as an immutable history entry. The task remains a project-scoped work item, and the update must be performed only within the project identified by the path parameter so that task movement across projects is never implied or allowed.
   *
   * The task lifecycle is limited to the supported states of open, in-progress, completed, and closed. When the status changes, the service must persist the new current status on the task and write a corresponding row into the task history store with the previous status, the new status, the acting member, and the transition timestamp. This ensures the system preserves a complete audit trail of how work progressed through the project.
   *
   * Access is restricted to users who are allowed to manage tasks in the project. A project lead may update tasks in the project where they hold that role, and a user with broader project management permission may update tasks according to their organization access rules. The endpoint must reject requests if the task does not belong to the specified project, if the new status is not one of the supported lifecycle values, or if the requester lacks task management authority for the project.
   *
   * This operation is typically used alongside task retrieval and task history viewing. Clients may first call the task detail endpoint to inspect the current state, then submit a status transition here, and finally fetch the task history to display the progression trail. The update and history insert must succeed atomically so that the task state and its audit record remain consistent.
   *
   * @param connection
   * @param projectId Target project identifier.
   * @param taskId Target task identifier within the project.
   * @param body New status to apply to the task.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implement this as a project-scoped task status transition endpoint.
   *
   * Service flow:
   * 1. Resolve the authenticated member and current organization context.
   * 2. Load the project by projectId within the current organization boundary.
   * 3. Load the task by taskId and verify it belongs to the specified project.
   * 4. Verify the requester is authorized to manage the task: either a project lead for the project or a user with project management permission.
   * 5. Validate the requested target status against the allowed task lifecycle values: open, in-progress, completed, closed.
   * 6. Validate the transition against business rules if transition restrictions are enforced by the domain layer.
   * 7. Execute a single transaction that:
   *    - updates hrm_time_tracking_tasks.status and updated_at;
   *    - inserts a new row into hrm_time_tracking_task_histories with hrm_time_tracking_task_id, hrm_time_tracking_member_id, from_status, to_status, and changed_at.
   * 8. Return the updated task entity after the transaction commits.
   *
   * Validation and edge cases:
   * - Reject if the task is not found in the specified project.
   * - Reject if the project is not accessible in the current organization.
   * - Reject if the requester lacks project-lead or project-management authority.
   * - Reject if the target status is missing or not one of the allowed values.
   * - Reject if the transition is disallowed by workflow policy.
   * - Preserve history integrity even when the same status is requested; if idempotent handling is preferred, return the current task without writing a duplicate history entry only when explicitly supported by the domain rules.
   *
   * Database considerations:
   * - Use the task table as the authoritative current-state source.
   * - Use the task history table as the append-only audit record.
   * - Never move the task to another project in this operation.
   * - Keep the update and history insert in one transaction to avoid drift between current state and audit trail.
   *
   * Error handling:
   * - 400 for invalid status or invalid transition.
   * - 403 for insufficient permissions.
   * - 404 when project or task is not found within scope.
   * - 409 if concurrent updates create a stale status conflict and optimistic locking is implemented.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async updateStatus(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("projectId")
    projectId: string & tags.Format<"uuid">,
    @TypedParam("taskId")
    taskId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingTask.IUpdateStatus,
  ): Promise<IHrmTimeTrackingTask> {
    try {
      return await patchHrmTimeTrackingMemberProjectsProjectIdTasksTaskIdStatus(
        {
          member,
          projectId,
          taskId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
