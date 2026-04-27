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

/**
 * Test the complete linear task status lifecycle (open → in-progress → completed → closed) and verify audit trail.
 *
 * Validates that each successful status transition creates an immutable TaskHistory entry with the correct previous and new status values, and that the response body returns the full IHrmTimeTrackingTask with updated status and auto-populated taskHistories.
 *
 * The authenticated member creates an organization (becoming the owner with an auto-created employee record), then creates a project and a task. Task status transitions are performed via the task update endpoint. Since the org owner holds organization-level project:manage permissions, explicit project-lead membership is not required for task management operations.
 *
 * Each transition is verified for correct status response, and the taskHistories array is inspected to confirm three chronologically ordered entries exist with the correct before/after status pairs.
 *
 * 1. Register a new member and authenticate.
 * 2. Create an organization with the authenticated member as owner.
 * 3. Create a project within the organization.
 * 4. Create a task (defaults to 'open').
 * 5. First transition — open → in-progress: Verify status and taskHistories entry.
 * 6. Second transition — in-progress → completed: Verify status and taskHistories entry.
 * 7. Third transition — completed → closed: Verify status and taskHistories entry.
 * 8. Verify all three TaskHistory entries exist, are chronologically ordered by created_at, and have the correct previous/new status and employee reference.
 */
export async function test_api_task_status_lifecycle_with_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {});
  // 2. Create an organization (auto-creates employee record for the owner)
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a project within the organization
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  // 4. Create a task (defaults to 'open' status)
  const task =
    await generate_random_hrm_time_tracking_member_projects_tasks_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(task);
  // Verify the task starts with 'open' status
  TestValidator.equals("initial task status", task.status, "open");
  // 5. First transition — open → in-progress
  const taskAfterFirstTransition =
    await api.functional.hrmTimeTracking.member.projects.tasks.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          status: "in-progress",
        } satisfies IHrmTimeTrackingTask.IUpdate,
      },
    );
  typia.assert(taskAfterFirstTransition);
  TestValidator.equals(
    "status after first transition",
    taskAfterFirstTransition.status,
    "in-progress",
  );
  TestValidator.predicate(
    "updatedAt is later than previous",
    () =>
      new Date(taskAfterFirstTransition.updatedAt).getTime() >
      new Date(task.updatedAt).getTime(),
  );
  // Verify the first TaskHistory entry
  const firstHistory = taskAfterFirstTransition.taskHistories.find(
    (h) => h.previous_status === "open" && h.new_status === "in-progress",
  );
  TestValidator.predicate(
    "first TaskHistory entry exists (open → in-progress)",
    () => firstHistory !== undefined,
  );
  // 6. Second transition — in-progress → completed
  const taskAfterSecondTransition =
    await api.functional.hrmTimeTracking.member.projects.tasks.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          status: "completed",
        } satisfies IHrmTimeTrackingTask.IUpdate,
      },
    );
  typia.assert(taskAfterSecondTransition);
  TestValidator.equals(
    "status after second transition",
    taskAfterSecondTransition.status,
    "completed",
  );
  // Verify the second TaskHistory entry
  const secondHistory = taskAfterSecondTransition.taskHistories.find(
    (h) => h.previous_status === "in-progress" && h.new_status === "completed",
  );
  TestValidator.predicate(
    "second TaskHistory entry exists (in-progress → completed)",
    () => secondHistory !== undefined,
  );
  // 7. Third transition — completed → closed
  const taskAfterThirdTransition =
    await api.functional.hrmTimeTracking.member.projects.tasks.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          status: "closed",
        } satisfies IHrmTimeTrackingTask.IUpdate,
      },
    );
  typia.assert(taskAfterThirdTransition);
  TestValidator.equals(
    "status after third transition",
    taskAfterThirdTransition.status,
    "closed",
  );
  // Verify the third TaskHistory entry
  const thirdHistory = taskAfterThirdTransition.taskHistories.find(
    (h) => h.previous_status === "completed" && h.new_status === "closed",
  );
  TestValidator.predicate(
    "third TaskHistory entry exists (completed → closed)",
    () => thirdHistory !== undefined,
  );
  // 8. Verify all three TaskHistory entries exist and are chronologically ordered
  const histories = taskAfterThirdTransition.taskHistories;
  TestValidator.equals("total TaskHistory count", histories.length, 3);
  // Verify chronological order by created_at (ascending)
  for (let i = 1; i < histories.length; i++) {
    const prevTime = new Date(histories[i - 1].created_at).getTime();
    const currTime = new Date(histories[i].created_at).getTime();
    TestValidator.predicate(
      `TaskHistory[${i - 1}] created_at is before TaskHistory[${i}]`,
      () => prevTime < currTime,
    );
  }
  // Verify each history entry has the correct employee reference
  for (const history of histories) {
    TestValidator.predicate(
      "TaskHistory has employee reference",
      () =>
        history.employee.id !== undefined &&
        history.employee.member.id === joined.id,
    );
  }
}
