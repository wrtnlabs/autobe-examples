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
 * Test task retrieval by project member with complete entity validation.
 *
 * Validates the complete task retrieval workflow including member authentication, organization creation, project setup, task creation, and task retrieval. Ensures that project members can access tasks within their assigned projects and that all task data is correctly returned.
 *
 * The test creates a member account, establishes an organization context, creates a project within that organization, and creates a task with various attributes including title, description, status, priority, estimated hours, and due date. The retrieval operation is then performed to verify that all task data is accessible and correctly structured.
 *
 * 1. Member joins the platform with unique credentials.
 * 2. Organization is created as the multi-tenancy boundary.
 * 3. Project is created within the organization with name and color.
 * 4. Task is created within the project with title, priority, and optional fields.
 * 5. Task is retrieved via GET endpoint and validated for completeness.
 * 6. All required and optional fields are verified including project reference, status, priority, timestamps, and relational data.
 */
export async function test_api_task_retrieval_by_project_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  // 3. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  // 4. Create task with comprehensive data
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        status: "open",
        priority: "high",
        estimated_hours: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies IHrmPlatformTask.ICreate,
    },
  );
  // 5. Retrieve task
  const retrievedTask =
    await api.functional.hrmPlatform.member.projects.tasks.at(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
      },
    );
  typia.assert(retrievedTask);
  // 6. Validate retrieved task business logic
  TestValidator.equals("task id matches", retrievedTask.id, task.id);
  TestValidator.equals("task title matches", retrievedTask.title, task.title);
  TestValidator.equals("task status matches", retrievedTask.status, "open");
  TestValidator.equals("task priority matches", retrievedTask.priority, "high");
  TestValidator.equals(
    "project reference matches",
    retrievedTask.project.id,
    project.id,
  );
  TestValidator.predicate(
    "description exists",
    retrievedTask.description !== null &&
      retrievedTask.description !== undefined,
  );
  TestValidator.predicate(
    "estimated hours valid",
    retrievedTask.estimated_hours !== null &&
      retrievedTask.estimated_hours !== undefined &&
      retrievedTask.estimated_hours > 0,
  );
  TestValidator.predicate(
    "due date exists",
    retrievedTask.due_date !== null && retrievedTask.due_date !== undefined,
  );
  TestValidator.equals("deleted_at is null", retrievedTask.deleted_at, null);
  TestValidator.equals(
    "subtasks is empty array",
    retrievedTask.subtasks.length,
    0,
  );
  TestValidator.predicate(
    "assignedEmployee is unassigned",
    retrievedTask.assignedEmployee === null ||
      retrievedTask.assignedEmployee === undefined,
  );
  TestValidator.predicate(
    "parentTask is top-level",
    retrievedTask.parentTask === null || retrievedTask.parentTask === undefined,
  );
}
