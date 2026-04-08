import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import type { IHrmTimeTrackProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProjectMember";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import type { IHrmTimeTrackTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_employees_create } from "../../../generate/generate_random_hrm_time_track_member_employees_create";
import { generate_random_hrm_time_track_member_organizations_create } from "../../../generate/generate_random_hrm_time_track_member_organizations_create";
import { generate_random_hrm_time_track_member_projects_create } from "../../../generate/generate_random_hrm_time_track_member_projects_create";
import { generate_random_hrm_time_track_member_projects_members_create } from "../../../generate/generate_random_hrm_time_track_member_projects_members_create";
import { generate_random_hrm_time_track_member_tasks_create } from "../../../generate/generate_random_hrm_time_track_member_tasks_create";
import { generate_random_hrm_time_track_member_timers_create } from "../../../generate/generate_random_hrm_time_track_member_timers_create";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";
import { prepare_random_hrm_time_track_project } from "../../../prepare/prepare_random_hrm_time_track_project";
import { prepare_random_hrm_time_track_project_member } from "../../../prepare/prepare_random_hrm_time_track_project_member";
import { prepare_random_hrm_time_track_task } from "../../../prepare/prepare_random_hrm_time_track_task";
import { prepare_random_hrm_time_track_timer } from "../../../prepare/prepare_random_hrm_time_track_timer";

/**
 * Test updating timer with a task that belongs to a different project than the new project assignment.
 *
 * Validates that the timer update endpoint enforces task-project relationship integrity. When updating a timer's project and task assignment, the system must verify that the specified task belongs to the new project. This test ensures that cross-project task associations are rejected to maintain data consistency.
 *
 * The test creates two separate projects with a task in one project, assigns an employee to both projects, starts a timer on one project, and then attempts to update the timer with a valid project-task combination followed by an invalid cross-project combination.
 *
 * 1. Authenticate as a member and create an organization.
 * 2. Create an employee record for the authenticated member.
 * 3. Create two projects: Project A and Project B.
 * 4. Create a task in Project A.
 * 5. Assign the employee to both Project A and Project B.
 * 6. Start a timer on Project B (without a task).
 * 7. Update the timer to Project A with the task from Project A (valid update).
 * 8. Verify the timer update succeeded and task-project relationship is correct.
 * 9. Attempt to update the timer to Project B with the task from Project A (invalid - task belongs to Project A).
 * 10. Verify the system rejects the update with an error.
 */
export async function test_api_timer_update_task_project_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create employee with the authenticated member's ID
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {
      body: {
        hrm_time_track_member_id: authorized.id,
      },
    },
  );
  typia.assert(employee);
  // 4. Create Project A
  const projectA = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project A",
      },
    },
  );
  typia.assert(projectA);
  // 5. Create Project B
  const projectB = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project B",
      },
    },
  );
  typia.assert(projectB);
  // 6. Create task in Project A
  const task = await generate_random_hrm_time_track_member_tasks_create(
    memberConnection,
    {
      body: {
        hrm_time_track_project_id: projectA.id,
      },
    },
  );
  typia.assert(task);
  // 7. Assign employee to Project A
  await generate_random_hrm_time_track_member_projects_members_create(
    memberConnection,
    {
      params: {
        projectId: projectA.id,
      },
      body: {
        employee_id: employee.id,
      },
    },
  );
  // 8. Assign employee to Project B
  await generate_random_hrm_time_track_member_projects_members_create(
    memberConnection,
    {
      params: {
        projectId: projectB.id,
      },
      body: {
        employee_id: employee.id,
      },
    },
  );
  // 9. Start a timer on Project B (without task)
  const timer = await generate_random_hrm_time_track_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: projectB.id,
      },
    },
  );
  typia.assert(timer);
  // 10. Update timer to Project A with task from Project A (valid)
  const updatedTimer = await api.functional.hrmTimeTrack.member.timers.update(
    memberConnection,
    {
      timerId: timer.id,
      body: {
        hrm_time_track_project_id: projectA.id,
        hrm_time_track_task_id: task.id,
      } satisfies IHrmTimeTrackTimer.IUpdate,
    },
  );
  typia.assert(updatedTimer);
  // 11. Verify the update succeeded - task belongs to the new project
  TestValidator.equals(
    "timer project updated to Project A",
    updatedTimer.project.id,
    projectA.id,
  );
  TestValidator.equals(
    "timer task is the task from Project A",
    updatedTimer.task?.id,
    task.id,
  );
  // 12. Attempt to update timer to Project B with task from Project A (invalid - mismatch)
  await TestValidator.error(
    "timer update rejected when task belongs to different project",
    async () => {
      await api.functional.hrmTimeTrack.member.timers.update(memberConnection, {
        timerId: timer.id,
        body: {
          hrm_time_track_project_id: projectB.id,
          hrm_time_track_task_id: task.id,
        } satisfies IHrmTimeTrackTimer.IUpdate,
      });
    },
  );
}
