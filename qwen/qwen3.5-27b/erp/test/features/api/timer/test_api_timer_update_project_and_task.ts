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
 * Test updating both project and task associations of a running timer.
 *
 * Validates the complete timer update workflow including project and task reassignment while the timer continues running. Ensures that the timer's started_at timestamp remains unchanged, is_active status persists, and the new project and task associations are correctly reflected in the response.
 *
 * Special attention is given to verifying that the employee has proper access to both the original and new projects through project member assignments, and that the task being assigned belongs to the new project.
 *
 * 1. Authenticate as a member and create organization context.
 * 2. Create an employee record linked to the authenticated member.
 * 3. Create two projects: Project A (original) and Project B (new target).
 * 4. Create a task in Project B for the update target.
 * 5. Assign the employee to both projects with appropriate roles.
 * 6. Start a timer on Project A without a task association.
 * 7. Update the timer to switch to Project B with the task association.
 * 8. Validate that started_at remains unchanged and is_active is still true.
 * 9. Verify the new project and task are correctly associated in the response.
 */
export async function test_api_timer_update_project_and_task(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection);
  typia.assert(authorized);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(organization);
  // 3. Create employee (linked to authenticated member)
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {
      body: {
        hrm_time_track_member_id: authorized.id,
      },
    },
  );
  typia.assert(employee);
  // 4. Create Project A (original timer project)
  const projectA = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project A - Original",
      },
    },
  );
  typia.assert(projectA);
  // 5. Create Project B (new timer project)
  const projectB = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project B - New Target",
      },
    },
  );
  typia.assert(projectB);
  // 6. Create a task in Project B
  const task = await generate_random_hrm_time_track_member_tasks_create(
    memberConnection,
    {
      body: {
        hrm_time_track_project_id: projectB.id,
        title: "Task in Project B",
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
        role: "member",
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
        role: "member",
      },
    },
  );
  // 9. Start a timer on Project A (without task)
  const timer = await generate_random_hrm_time_track_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: projectA.id,
        description: "Working on Project A",
      },
    },
  );
  typia.assert(timer);
  // Store original started_at for validation
  const originalStartedAt = timer.started_at;
  // 10. Update the timer to switch to Project B with task association
  const updatedTimer = await api.functional.hrmTimeTrack.member.timers.update(
    memberConnection,
    {
      timerId: timer.id,
      body: {
        hrm_time_track_project_id: projectB.id,
        hrm_time_track_task_id: task.id,
        description: "Updated to work on Project B with task",
      } satisfies IHrmTimeTrackTimer.IUpdate,
    },
  );
  typia.assert(updatedTimer);
  // 11. Validate started_at remains unchanged
  TestValidator.equals(
    "started_at timestamp preserved",
    updatedTimer.started_at,
    originalStartedAt,
  );
  // 12. Validate is_active remains true
  TestValidator.predicate("timer is still active", updatedTimer.is_active);
  // 13. Validate new project association
  TestValidator.equals(
    "project updated to Project B",
    updatedTimer.project.id,
    projectB.id,
  );
  TestValidator.equals(
    "project name matches Project B",
    updatedTimer.project.name,
    "Project B - New Target",
  );
  // 14. Validate new task association
  TestValidator.predicate("task is now associated", updatedTimer.task !== null);
  if (updatedTimer.task !== null) {
    TestValidator.equals(
      "task ID matches created task",
      updatedTimer.task.id,
      task.id,
    );
    TestValidator.equals(
      "task belongs to Project B",
      updatedTimer.task.project.id,
      projectB.id,
    );
  }
  // 15. Validate updated_at reflects the change
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedTimer.updated_at,
    timer.updated_at,
  );
  // 16. Validate description was updated
  TestValidator.equals(
    "description updated correctly",
    updatedTimer.description,
    "Updated to work on Project B with task",
  );
}