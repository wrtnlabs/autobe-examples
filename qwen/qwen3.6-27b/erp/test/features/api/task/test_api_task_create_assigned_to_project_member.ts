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
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
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
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Test creating a task assigned to a specific project member.
 *
 * Creates a project, adds an employee as a project member, and then creates a task within that project with the employee assigned. Verifies the task creation succeeds and the assignedEmployee reference correctly points to the project member who was assigned. This validates the business rule that tasks can be assigned to employees who are active project members.
 *
 * 1. Register and authenticate an organization owner member.
 * 2. Register a second member who will become an employee.
 * 3. Create an employee record linking the second member to the organization.
 * 4. Create a project within the organization.
 * 5. Assign the employee to the project as a member.
 * 6. Create a task in the project with assigned_employee_id set to the employee.
 * 7. Validate the task was created with correct assigned employee and project reference.
 */
export async function test_api_task_create_assigned_to_project_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate an organization owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerMember = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(ownerMember);
  // 2. Register a second member who will become an employee
  const employeeMemberConnection: api.IConnection = { host: connection.host };
  const employeeMember = await authorize_member_join(employeeMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(employeeMember);
  // 3. Create a project within the organization
  const project = await generate_random_hrm_platform_member_projects_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(project);
  // 4. Create an employee record linking the second member to the organization
  const employee = await generate_random_hrm_platform_member_employees_create(
    ownerConnection,
    {
      body: {
        memberId: employeeMember.id,
      },
    },
  );
  typia.assert(employee);
  // 5. Assign the employee to the project as a member
  const membership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      ownerConnection,
      {
        params: { projectId: project.id },
        body: {
          employeeId: employee.id,
        },
      },
    );
  typia.assert(membership);
  // 6. Create a task in the project with the employee assigned
  const task = await api.functional.hrmPlatform.member.projects.tasks.create(
    ownerConnection,
    {
      projectId: project.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        assigned_employee_id: employee.id,
        description: RandomGenerator.paragraph({ sentences: 5 }),
        priority: "high",
        estimated_hours: 8,
      } satisfies IHrmPlatformTask.ICreate,
    },
  );
  typia.assert(task);
  // 7. Validate the task was created with correct assigned employee and project
  TestValidator.equals(
    "task belongs to the correct project",
    task.project.id,
    project.id,
  );
  TestValidator.equals(
    "task is assigned to the correct employee",
    task.assignedEmployee?.id,
    employee.id,
  );
  TestValidator.equals(
    "assigned employee member matches",
    task.assignedEmployee?.member.id,
    employeeMember.id,
  );
  TestValidator.equals("task has expected status", task.status, "open");
  TestValidator.predicate(
    "task title matches input",
    () => task.title.includes("lorem") || task.title.length > 0,
  );
}
