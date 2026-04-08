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
 * Test timer creation with both project and task association.
 *
 * Validates the complete timer creation flow including member registration, organization setup, employee creation, project setup, task creation, and timer initialization with both project and task references. Ensures that the timer correctly associates with both a project and a specific task within that project, and that the employee has proper access to both entities.
 *
 * Special attention is given to verifying that the task belongs to the specified project, the employee is assigned to the project, and the timer response includes the complete task information (not null).
 *
 * 1. Member registers and authenticates to the system.
 * 2. Organization is created for the employee context.
 * 3. Employee record is created linking the member to the organization.
 * 4. Project is created within the organization.
 * 5. Employee is assigned to the project with member role.
 * 6. Task is created within the project for granular time tracking.
 * 7. Timer is created with both project and task association.
 * 8. Validates timer references both project and task correctly.
 */
export async function test_api_timer_create_with_project_and_task(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection);
  typia.assert(memberAuth);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create employee linking member to organization
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {
      body: {
        hrm_time_track_member_id: memberAuth.id,
      },
    },
  );
  typia.assert(employee);
  // 4. Create project within organization
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 5. Assign employee to project with member role
  const projectMember =
    await generate_random_hrm_time_track_member_projects_members_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          employee_id: employee.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // 6. Create task within project
  const task = await generate_random_hrm_time_track_member_tasks_create(
    memberConnection,
    {
      body: {
        hrm_time_track_project_id: project.id,
      },
    },
  );
  typia.assert(task);
  // 7. Create timer with both project and task association
  const timer = await generate_random_hrm_time_track_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        task_id: task.id,
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(timer);
  // 8. Validate timer references both project and task correctly
  TestValidator.equals("timer project matches", timer.project.id, project.id);
  TestValidator.equals("timer task matches", timer.task?.id, task.id);
  TestValidator.predicate("timer task is not null", timer.task !== null);
  TestValidator.equals(
    "timer employee matches",
    timer.employee.id,
    employee.id,
  );
  TestValidator.predicate("timer is active", timer.is_active);
  TestValidator.predicate(
    "timer has started_at timestamp",
    timer.started_at !== undefined,
  );
}
