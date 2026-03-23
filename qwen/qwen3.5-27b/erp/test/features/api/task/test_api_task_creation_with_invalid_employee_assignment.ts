import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
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
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Test task creation validation for employee assignment.
 * Verifies that task creation fails when assigning an employee who is not a member of the project,
 * and succeeds when no employee is assigned.
 */
export async function test_api_task_creation_with_invalid_employee_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as project lead (Member A)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123",
      href: "https://example.com/join",
      referrer: "https://example.com/join",
    },
  });
  typia.assert(memberA);
  // 2. Create a project with Member A as project lead
  const project = await generate_random_hrm_platform_member_projects_create(
    memberAConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        color_code: "#FF5733",
        budget_hours: typia.random<number & tags.Type<"uint32">>(),
      },
    },
  );
  typia.assert(project);
  // 3. Register another member (Member B) in the same organization
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123",
      href: "https://example.com/join",
      referrer: "https://example.com/join",
    },
  });
  typia.assert(memberB);
  // 4. Attempt to create a task with invalid employee assignment (Member B is not a project member)
  await TestValidator.error(
    "task creation should fail when assigned employee is not a project member",
    async () => {
      await generate_random_hrm_platform_member_projects_tasks_create(
        memberAConnection,
        {
          params: { projectId: project.id },
          body: {
            title: "Test task with invalid assignment",
            description:
              "This task should fail because assigned employee is not a project member",
            status: "open",
            priority: "medium",
            assigned_employee_id: memberB.id,
            parent_task_id: null,
          },
        },
      );
    },
  );
  // 5. Create the same task without employee assignment (should succeed)
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberAConnection,
    {
      params: { projectId: project.id },
      body: {
        title: "Test task without assignment",
        description: "This task should succeed because no employee is assigned",
        status: "open",
        priority: "medium",
        assigned_employee_id: null,
        parent_task_id: null,
      },
    },
  );
  typia.assert(task);
  // 6. Validate the created task
  TestValidator.equals(
    "task title matches input",
    task.title,
    "Test task without assignment",
  );
  TestValidator.equals("task status is open", task.status, "open");
  TestValidator.equals("task priority is medium", task.priority, "medium");
  TestValidator.equals(
    "task has no assigned employee",
    task.assignedEmployee,
    null,
  );
  TestValidator.equals("task has no parent task", task.parentTask, null);
  TestValidator.equals(
    "task belongs to correct project",
    task.project.id,
    project.id,
  );
}
