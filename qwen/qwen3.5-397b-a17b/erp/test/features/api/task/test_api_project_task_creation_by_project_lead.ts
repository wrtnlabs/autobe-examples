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
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Test that an organization owner can successfully create a new task within their project.
 *
 * Validates the task creation flow including member authentication, organization and project setup, and task creation with required and optional fields. Ensures that the task is correctly associated with the project and that the default status is 'open'.
 *
 * Note: This test uses the organization owner's inherent project:manage permission rather than project-lead role assignment, as the employee creation API is not available in the current API set. The organization owner automatically receives full permissions including project management capabilities.
 *
 * 1. Member joins with email and password credentials, automatically becoming organization owner.
 * 2. Organization is created with name, currency, timezone, and fiscal year settings.
 * 3. Project is created within the organization with name, color, and optional budget.
 * 4. Task is created with title, priority, description, estimated_hours, and due_date.
 * 5. Validates task status is 'open' by default.
 * 6. Validates task is associated with correct project via project relation.
 * 7. Validates all task fields are present including id, timestamps, and nested relations.
 */
export async function test_api_project_task_creation_by_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication - owner gets full permissions automatically
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization - member becomes owner with full permissions
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
  // 3. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733",
        description: RandomGenerator.content({ paragraphs: 2 }),
        budgetHours: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<100>
        >(),
      },
    },
  );
  typia.assert(project);
  // 4. Create task with all fields - owner has project:manage permission
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        priority: RandomGenerator.pick([
          "low",
          "medium",
          "high",
          "urgent",
        ] as const),
        estimated_hours: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      },
    },
  );
  typia.assert(task);
  // 5. Validate task status is 'open' by default
  TestValidator.equals("status is open", task.status, "open");
  // 6. Validate task is associated with correct project
  TestValidator.equals("project id matches", task.project.id, project.id);
  TestValidator.equals("project name matches", task.project.name, project.name);
  // 7. Validate all task fields are present
  TestValidator.predicate("has valid id", task.id !== undefined);
  TestValidator.predicate("has title", task.title !== undefined);
  TestValidator.predicate("has priority", task.priority !== undefined);
  TestValidator.predicate("has created_at", task.created_at !== undefined);
  TestValidator.predicate("has updated_at", task.updated_at !== undefined);
  TestValidator.predicate("deleted_at is null", task.deleted_at === null);
  TestValidator.predicate("has subtasks array", Array.isArray(task.subtasks));
  TestValidator.equals("subtasks is empty", task.subtasks.length, 0);
  // Validate optional fields were set
  TestValidator.predicate(
    "has description",
    task.description !== undefined && task.description !== null,
  );
  TestValidator.predicate(
    "has estimated_hours",
    task.estimated_hours !== undefined && task.estimated_hours !== null,
  );
  TestValidator.predicate(
    "has due_date",
    task.due_date !== undefined && task.due_date !== null,
  );
}
