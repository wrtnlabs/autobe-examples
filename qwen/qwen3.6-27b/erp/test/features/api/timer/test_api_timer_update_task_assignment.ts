import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

/**
 * Test updating task assignment of a running timer for granular work item tracking.
 *
 * Validates that an active timer tracking time against a project can be updated to associate with a specific task without stopping the timer session. The test ensures that after updating the task assignment, the timer remains active (stopped_at and deleted_at stay null) while the task field now references the newly assigned task. The project association remains unchanged, confirming that only the task field is updated.
 *
 * This verifies the business rule that running timers can be modified for detailed time attribution without interrupting the tracking session.
 *
 * 1. Register and authenticate a member with the join endpoint.
 * 2. Create a custom role with project and time management permissions.
 * 3. Create an employee record linking the member to the organization.
 * 4. Create an active project for time tracking.
 * 5. Assign the employee to the project as a member.
 * 6. Create a task within the project for granular tracking.
 * 7. Start a timer on the project without any task assignment.
 * 8. Verify initial timer state has no task and is active.
 * 9. Update the running timer to assign the task.
 * 10. Validate the updated timer remains active with task assigned and project unchanged.
 */
export async function test_api_timer_update_task_assignment(
  connection: api.IConnection,
): Promise<void> {
  /* c8 ignore next */
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IHrmPlatformMember.IAuthorized = await authorize_member_join(
    memberConnection,
    { body: {} },
  );
  // 2. Create a custom role with necessary permissions
  const role: IHrmPlatformRole =
    await generate_random_hrm_platform_member_roles_create(memberConnection, {
      body: {
        permissionKeys: ["project:manage", "employee:manage", "time:manage"],
      },
    });
  // 3. Create an employee record for the authenticated member
  const employee: IHrmPlatformEmployee =
    await generate_random_hrm_platform_member_employees_create(
      memberConnection,
      {
        body: {
          memberId: member.id,
          roleId: role.id,
          employmentType: "full-time",
        },
      },
    );
  // 4. Create an active project for time tracking
  const project: IHrmPlatformProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {},
      },
    );
  // 5. Assign employee to the project as a member
  const membership: IHrmPlatformProjectMembership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          employeeId: employee.id,
          capacityRole: "member",
        },
      },
    );
  // 6. Create a task within the project for granular tracking
  const task: IHrmPlatformTask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {},
      },
    );
  // 7. Start a timer on the project WITHOUT task assignment
  const timer: IHrmPlatformTimer =
    await generate_random_hrm_platform_member_timers_create(memberConnection, {
      body: {
        project_id: project.id,
        task_id: null,
      },
    });
  // 8. Verify initial timer state: no task, active (stopped_at null, deleted_at null)
  typia.assert(timer);
  TestValidator.equals("initial timer has no task", timer.task, null);
  TestValidator.equals(
    "initial timer is active - stopped_at is null",
    timer.stopped_at,
    null,
  );
  TestValidator.equals(
    "initial timer not discarded - deleted_at is null",
    timer.deleted_at,
    null,
  );
  // 9. Update the running timer to assign the task
  const taskId = task.id;
  const updatedTimer: IHrmPlatformTimer =
    await api.functional.hrmPlatform.member.timers.update(memberConnection, {
      timerId: timer.id,
      body: { taskId },
    });
  typia.assert(updatedTimer);
  // 10. Validate the updated timer: still active, task assigned, project unchanged
  TestValidator.equals(
    "timer remains active - stopped_at is still null",
    updatedTimer.stopped_at,
    null,
  );
  TestValidator.equals(
    "timer not discarded - deleted_at is still null",
    updatedTimer.deleted_at,
    null,
  );
  TestValidator.predicate(
    "timer task is now assigned",
    updatedTimer.task !== null,
  );
  TestValidator.equals(
    "timer task id matches the assigned task",
    updatedTimer.task!.id,
    taskId,
  );
  TestValidator.equals(
    "timer project remains unchanged",
    updatedTimer.project.id,
    project.id,
  );
}
