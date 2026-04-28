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
 * Test task status forward transition from open to in-progress.
 *
 * Validates that a task status can be successfully updated from 'open' to 'in-progress', following the defined task lifecycle. This test verifies forward status transition rules by creating the complete prerequisite chain: member authentication, employee creation, project setup, project membership assignment, and task creation.
 *
 * The test ensures that after updating the task status, the new status is correctly reflected in the response, other task fields are preserved unchanged, and the task's updated timestamp indicates a modification occurred.
 *
 * 1. Member1 joins the platform as organization Owner.
 * 2. Member2 joins the platform as a second member.
 * 3. Member1 creates an employee record linking member2 to the organization.
 * 4. Member1 creates a project within the organization.
 * 5. Member1 assigns member2's employee to the project as a project member.
 * 6. An open task is created within the project.
 * 7. Task status is updated from 'open' to 'in-progress'.
 * 8. Validates the new status, field retention, and timestamp update.
 */
export async function test_api_task_update_status_forward_transition(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member1 joins as organization Owner
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member1);
  // 2. Member2 joins as second platform member
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member2);
  // 3. Member1 creates employee record for member2 in org1
  const employee = await generate_random_hrm_platform_member_employees_create(
    member1Connection,
    {
      body: {
        memberId: member2.id,
        employmentType: "full-time",
      },
    },
  );
  typia.assert(employee);
  // 4. Member1 creates a project
  const project = await generate_random_hrm_platform_member_projects_create(
    member1Connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(project);
  // 5. Member1 assigns employee (member2) to project as member
  const membership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      member1Connection,
      {
        params: { projectId: project.id },
        body: {
          employeeId: employee.id,
          capacityRole: "member",
        },
      },
    );
  typia.assert(membership);
  // 6. Create task in 'open' status within the project
  const originalCreatedAt = new Date().toISOString();
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    member1Connection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        status: "open",
      },
    },
  );
  typia.assert(task);
  TestValidator.equals("initial status is open", task.status, "open");
  // 7. Update task status from open to in-progress
  const body = {
    status: "in-progress",
  } satisfies IHrmPlatformTask.IUpdate;
  const updatedTask =
    await api.functional.hrmPlatform.member.projects.tasks.update(
      member1Connection,
      {
        projectId: project.id,
        taskId: task.id,
        body,
      },
    );
  typia.assert(updatedTask);
  // 8. Validate forward transition succeeded
  TestValidator.equals(
    "status is in-progress",
    updatedTask.status,
    "in-progress",
  );
  TestValidator.equals("title retained", updatedTask.title, task.title);
  TestValidator.equals(
    "project id matches",
    updatedTask.project.id,
    project.id,
  );
  TestValidator.notEquals(
    "timestamp updated",
    updatedTask.createdAt,
    updatedTask.updatedAt,
  );
}
