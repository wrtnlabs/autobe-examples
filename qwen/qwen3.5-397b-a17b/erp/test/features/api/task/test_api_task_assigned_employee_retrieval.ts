import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Test retrieval of a task with assignedEmployee field validation.
 *
 * Validates the task retrieval endpoint within the HRM platform, ensuring that task data is correctly returned including the assignedEmployee field. The test verifies the complete workflow from member authentication through task creation and retrieval, confirming that the assignedEmployee field properly reflects the task assignment state.
 *
 * Since employee records are managed through separate organizational processes not exposed in this API scope, the test creates a task without employee assignment to validate that the assignedEmployee field correctly returns null for unassigned tasks. This demonstrates the API's proper handling of optional employee assignment relationships.
 *
 * 1. Member registers and authenticates to establish organizational context.
 * 2. Organization is created with the member automatically becoming the owner.
 * 3. Project is created within the organization for task management.
 * 4. Task is created without employee assignment (assigned_employee_id omitted).
 * 5. Task is retrieved and validated to ensure all fields are correctly returned.
 * 6. assignedEmployee field is verified to be null for unassigned tasks.
 * 7. Task metadata including title, priority, status, and project reference are validated.
 */
export async function test_api_task_assigned_employee_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 4. Create task without employee assignment
  // assigned_employee_id is optional - omitting it creates an unassigned task
  // Must provide required fields: title and priority
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        priority: RandomGenerator.pick([
          "low",
          "medium",
          "high",
          "urgent",
        ] as const),
        assigned_employee_id: null,
      } satisfies IHrmPlatformTask.ICreate,
    },
  );
  typia.assert(task);
  // 5. Retrieve the task
  const retrievedTask =
    await api.functional.hrmPlatform.member.projects.tasks.at(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
      },
    );
  typia.assert(retrievedTask);
  // 6. Validate task retrieval
  TestValidator.equals("task id matches", retrievedTask.id, task.id);
  TestValidator.equals("task title matches", retrievedTask.title, task.title);
  TestValidator.equals(
    "project id matches",
    retrievedTask.project.id,
    project.id,
  );
  TestValidator.equals(
    "task status matches",
    retrievedTask.status,
    task.status,
  );
  TestValidator.equals(
    "task priority matches",
    retrievedTask.priority,
    task.priority,
  );
  // 7. Validate assignedEmployee field is null for unassigned task
  TestValidator.predicate(
    "assignedEmployee is null for unassigned task",
    retrievedTask.assignedEmployee === null ||
      retrievedTask.assignedEmployee === undefined,
  );
  // 8. Validate project reference contains organization context
  TestValidator.equals(
    "project organization id matches",
    retrievedTask.project.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "project organization name matches",
    retrievedTask.project.organization.name,
    organization.name,
  );
}
