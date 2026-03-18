import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
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
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Test that requesting a task with a project ID that doesn't match the task's actual project returns 404 Not Found.
 *
 * This test verifies the security measure that prevents task existence leakage across projects.
 * When a user attempts to access a task using a project ID that doesn't match the task's actual
 * project, the API should return 404 without revealing that the task exists in another project.
 *
 * Setup:
 * 1. Member registration and authentication
 * 2. Organization creation
 * 3. Employee record creation
 * 4. Two projects creation (project1 and project2)
 * 5. Employee assignment to both projects
 * 6. Task creation in project2
 *
 * Test: Attempt to GET task from project1 (mismatched project ID)
 * Expected: 404 Not Found with generic error message
 */
export async function test_api_task_not_found_when_task_belongs_to_different_project(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and authenticate
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Create authenticated connection
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${memberAuth.token.access}`,
    },
  };
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create employee record for the member
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: memberAuth.id,
        role_id: organization.owner.id,
        employment_type: "full-time",
      },
    },
  );
  typia.assert(employee);
  // 4. Create first project (mismatched project)
  const project1 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#FF0000",
      },
    },
  );
  typia.assert(project1);
  // 5. Create second project (where task will actually exist)
  const project2 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#00FF00",
      },
    },
  );
  typia.assert(project2);
  // 6. Assign employee to both projects
  await generate_random_hrm_platform_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project1.id },
      body: {
        hrm_platform_employee_id: employee.id,
        role: "project-lead",
      },
    },
  );
  await generate_random_hrm_platform_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project2.id },
      body: {
        hrm_platform_employee_id: employee.id,
        role: "project-lead",
      },
    },
  );
  // 7. Create task in second project
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project2.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        status: "open",
        priority: "medium",
      },
    },
  );
  typia.assert(task);
  // Verify task belongs to project2
  TestValidator.equals("task project", task.project.id, project2.id);
  // 8. Test: Attempt to get task using project1's ID (mismatched)
  // This should return 404 Not Found without revealing task exists in project2
  await TestValidator.httpError(
    "task not found with mismatched project ID",
    404,
    async () => {
      await api.functional.hrmPlatform.member.projects.tasks.at(
        memberConnection,
        {
          projectId: project1.id,
          taskId: task.id,
        },
      );
    },
  );
}
