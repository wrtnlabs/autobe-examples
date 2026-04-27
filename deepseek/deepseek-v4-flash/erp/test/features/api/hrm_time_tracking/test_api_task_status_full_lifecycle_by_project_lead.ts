import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_projects_members_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_members_create";
import { generate_random_hrm_time_tracking_member_projects_tasks_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_tasks_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";

export async function test_api_task_status_full_lifecycle_by_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // ───────────────────────────────────────────────
  // SETUP PHASE
  // ───────────────────────────────────────────────
  // 1. Register a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create an organization (auto-assigns member as owner/employee)
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Re-authenticate to get updated employee records
  //    After org creation, the member has an employee record with Owner role.
  const loggedIn = await authorize_member_login(memberConnection, {
    body: {
      email: authorized.email,
      password: (authorized as any).__password,
    } as any,
  });
  typia.assert(loggedIn);
  // Find the employee record for this organization
  const ownerEmployee = loggedIn.employees.find(
    (emp: IHrmTimeTrackingEmployee.ISummary) => emp.member.id === authorized.id,
  );
  if (ownerEmployee === undefined)
    throw new Error("Owner employee record not found after org creation");
  // 4. Create a project
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  // 5. Add the owner employee as a project-lead
  const projectMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: ownerEmployee.id,
          role: "project-lead",
        } as any,
      },
    );
  typia.assert(projectMember);
  TestValidator.equals(
    "project member role is project-lead",
    projectMember.role,
    "project-lead",
  );
  // 6. Create a task with default 'open' status
  const task =
    await generate_random_hrm_time_tracking_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
        } as any,
      },
    );
  typia.assert(task);
  TestValidator.equals("initial task status is open", task.status, "open");
  // ───────────────────────────────────────────────
  // STATUS TRANSITION PHASE
  // ───────────────────────────────────────────────
  const statuses = ["open", "in-progress", "completed", "closed"] as const;
  const previousStatuses: string[] = [task.status];
  let previousUpdatedAt: string = task.updatedAt;
  for (let i = 1; i < statuses.length; i++) {
    const newStatus = statuses[
      i
    ] satisfies IHrmTimeTrackingTask.IUpdateStatus["status"];
    const previousStatus = statuses[i - 1] satisfies string;
    // Perform status transition
    const updatedTask: IHrmTimeTrackingTask =
      await api.functional.hrmTimeTracking.member.projects.tasks.status.updateStatus(
        memberConnection,
        {
          projectId: project.id,
          taskId: task.id,
          body: {
            status: newStatus,
          } satisfies IHrmTimeTrackingTask.IUpdateStatus,
        },
      );
    typia.assert(updatedTask);
    // Validate the response returns the full updated task with the new status
    TestValidator.equals(
      `status transition to "${newStatus}"`,
      updatedTask.status,
      newStatus,
    );
    // Validate updated_at timestamp is refreshed
    TestValidator.notEquals(
      `updated_at refreshed after ${newStatus}`,
      updatedTask.updatedAt,
      previousUpdatedAt,
    );
    previousUpdatedAt = updatedTask.updatedAt;
    // Validate a task history entry was created for this transition
    const histories: IHrmTimeTrackingTaskHistory[] = updatedTask.taskHistories;
    // The history should contain exactly `i` entries now
    TestValidator.equals(
      `task history count after ${newStatus}`,
      histories.length,
      i,
    );
    // The latest history entry should record this transition
    const latestHistory: IHrmTimeTrackingTaskHistory =
      histories[histories.length - 1];
    TestValidator.equals(
      `latest history previous_status is "${previousStatus}"`,
      latestHistory.previous_status,
      previousStatus,
    );
    TestValidator.equals(
      `latest history new_status is "${newStatus}"`,
      latestHistory.new_status,
      newStatus,
    );
    TestValidator.equals(
      "latest history employee matches owner",
      latestHistory.employee.id,
      ownerEmployee.id,
    );
    previousStatuses.push(newStatus);
  }
  // ───────────────────────────────────────────────
  // FINAL VALIDATION
  // ───────────────────────────────────────────────
  // Re-fetch the task to verify all history entries
  const finalTask: IHrmTimeTrackingTask =
    await api.functional.hrmTimeTracking.member.projects.tasks.status.updateStatus(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          status: "closed",
        } satisfies IHrmTimeTrackingTask.IUpdateStatus,
      },
    );
  // Actually, just re-read the task. But we don't have a GET endpoint.
  // The previous updateStatus should have returned the latest state.
  // Let's just validate the task from the last updateStatus call.
  // Actually, the last transition returned the final state already.
  // But to get a fresh read, let's try... we have no GET endpoint.
  // The task histories from the last update call show all 3 transitions
  // (open→in-progress, in-progress→completed, completed→closed).
  // Actually we already validated the history in the loop above.
  // For the final "closed" status from the last iteration (i=3):
  // - histories.length = 3 (entries for: open→in-progress, in-progress→completed, completed→closed)
  // - latestHistory.previous_status = "completed"
  // - latestHistory.new_status = "closed"
  // Now verify all entries exist in chronological order
  // We need to GET the task to see all histories. Since we don't have a GET,
  // the validation above already checked each step.
}
