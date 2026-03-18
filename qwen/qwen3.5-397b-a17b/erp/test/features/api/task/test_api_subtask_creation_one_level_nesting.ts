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

export async function test_api_subtask_creation_one_level_nesting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
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
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create employee record (member becomes employee in their own org)
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: memberAuth.id,
        role_id: typia.random<string & tags.Format<"uuid">>(),
        employment_type: "full-time",
      } satisfies IHrmPlatformEmployee.ICreate,
    },
  );
  typia.assert(employee);
  // 4. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#FF5733",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 5. Assign employee to project as project-lead for task creation permission
  const projectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: employee.id,
          role: "project-lead",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 6. Create parent task (top-level task without parent_id)
  const parentTask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          status: "open",
          priority: "medium",
        } satisfies IHrmPlatformTask.ICreate,
      },
    );
  typia.assert(parentTask);
  TestValidator.equals("parent task has no parent", parentTask.parent, null);
  TestValidator.equals(
    "parent task belongs to project",
    parentTask.project.id,
    project.id,
  );
  // 7. Create subtask with parent_id referencing the parent task
  const subtask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          status: "open",
          priority: "high",
          parent_id: parentTask.id,
        } satisfies IHrmPlatformTask.ICreate,
      },
    );
  typia.assert(subtask);
  // 8. Verify subtask's parent relationship
  TestValidator.notEquals("subtask has parent", subtask.parent, null);
  if (subtask.parent !== null) {
    TestValidator.equals(
      "subtask parent id matches",
      subtask.parent.id,
      parentTask.id,
    );
    TestValidator.equals(
      "subtask parent title matches",
      subtask.parent.title,
      parentTask.title,
    );
  }
  TestValidator.equals(
    "subtask belongs to same project",
    subtask.project.id,
    project.id,
  );
  // 9. Test edge case: attempt to create nested subtask (subtask under subtask) - should fail
  await TestValidator.error("nested subtask rejected", async () => {
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          status: "open",
          priority: "low",
          parent_id: subtask.id,
        } satisfies IHrmPlatformTask.ICreate,
      },
    );
  });
  // 10. Create second project for cross-project validation
  const secondProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          color_code: "#33FF57",
        } satisfies IHrmPlatformProject.ICreate,
      },
    );
  typia.assert(secondProject);
  // 11. Test edge case: attempt to create subtask with parent from different project - should fail
  await TestValidator.error("cross-project subtask rejected", async () => {
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: secondProject.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          status: "open",
          priority: "medium",
          parent_id: parentTask.id,
        } satisfies IHrmPlatformTask.ICreate,
      },
    );
  });
}
