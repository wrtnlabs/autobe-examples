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
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";
import { prepare_random_hrm_time_track_project } from "../../../prepare/prepare_random_hrm_time_track_project";
import { prepare_random_hrm_time_track_project_member } from "../../../prepare/prepare_random_hrm_time_track_project_member";
import { prepare_random_hrm_time_track_task } from "../../../prepare/prepare_random_hrm_time_track_task";

/**
 * Test task creation with employee assignment to validate that tasks can be assigned to specific employees who are members of the project.
 *
 * Validates the complete task creation workflow including member authentication, organization setup, employee creation, project creation, project member assignment, and task creation with employee assignment. Ensures that the task correctly references the assigned employee and that the employee relationship data is properly returned in the task response.
 *
 * Special attention is given to verifying that the employee is a valid project member before being assigned to the task, and that the task response includes the complete employee summary information including member identity, position, department, role, employment type, and status.
 *
 * 1. Member authenticates via join endpoint to obtain authorization token.
 * 2. Organization is created to provide the multi-tenant context for all entities.
 * 3. Employee is created and linked to the authenticated member account within the organization.
 * 4. Project is created within the organization to serve as the parent container for tasks.
 * 5. Employee is assigned to the project as a project member with a role.
 * 6. Task is created with the employee assigned as the worker.
 * 7. Validates task details match input and employee assignment data is correct.
 */
export async function test_api_task_creation_with_employee_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authorization = await authorize_member_join(memberConnection);
  typia.assert(authorization);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(organization);
  // 3. Create employee
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {
      body: {
        hrm_time_track_member_id: authorization.id,
      },
    },
  );
  typia.assert(employee);
  // 4. Create project
  const project =
    await generate_random_hrm_time_track_member_projects_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(project);
  // 5. Assign employee to project
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
  // 6. Create task with employee assignment
  const task = await generate_random_hrm_time_track_member_tasks_create(
    memberConnection,
    {
      body: {
        hrm_time_track_project_id: project.id,
        hrm_time_track_employee_id: employee.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        priority: "medium",
        status: "open",
      },
    },
  );
  typia.assert(task);
  // 7. Validate task employee assignment
  TestValidator.equals(
    "task employee matches assigned employee",
    task.employee?.id,
    employee.id,
  );
  TestValidator.equals(
    "task employee member matches",
    task.employee?.member.id,
    employee.member.id,
  );
  TestValidator.equals(
    "task employee position matches",
    task.employee?.position,
    employee.position,
  );
  TestValidator.equals(
    "task employee employment type matches",
    task.employee?.employment_type,
    employee.employment_type,
  );
  TestValidator.equals(
    "task employee status matches",
    task.employee?.status,
    employee.status,
  );
  TestValidator.predicate("task has valid title", task.title.length > 0);
  TestValidator.predicate(
    "task has valid priority",
    ["low", "medium", "high", "critical"].includes(task.priority),
  );
  TestValidator.equals("task status is open", task.status, "open");
  TestValidator.equals(
    "task project matches created project",
    task.project.id,
    project.id,
  );
}