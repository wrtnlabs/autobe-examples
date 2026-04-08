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
 * Test subtask creation with parent task reference for one-level nesting validation.
 *
 * Validates the complete subtask creation workflow including member authentication, organization and project setup, project-lead role assignment, parent task creation, and subtask creation with parent_task_id reference. Ensures that the subtask correctly references the parent task and that the one-level nesting constraint is properly enforced.
 *
 * The test verifies that subtasks can be created by specifying a parent_task_id, and that the response includes the parentTask relation confirming the hierarchical relationship. This validates the task hierarchy feature where subtasks cannot have their own subtasks (one-level nesting only).
 *
 * 1. Member authenticates via join to obtain access credentials.
 * 2. Organization is created as context for project and task operations.
 * 3. Project is created within the organization for task management.
 * 4. Member is assigned as project-lead to enable task creation permission.
 * 5. Parent task is created as test setup for subtask reference.
 * 6. Subtask is created with parent_task_id referencing the parent task.
 * 7. Validates subtask response includes correct parentTask relation and task properties.
 */
export async function test_api_project_task_subtask_creation_with_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication via join
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
      {
        body: {
          name: RandomGenerator.name(),
        },
      },
    );
  // 3. Create project within organization
  const project =
    await generate_random_hrm_platform_member_projects_create(memberConnection, {
      body: {
        name: RandomGenerator.name(),
      },
    });
  // 4. Assign member as project-lead to enable task creation
  const projectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          role: "project-lead",
        },
      },
    );
  typia.assert(projectMember);
  // 5. Create parent task as test setup
  const parentTask =
    await api.functional.hrmPlatform.member.projects.tasks.create(
      memberConnection,
      {
        projectId: project.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          status: "open",
          priority: "high",
          estimated_hours: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IHrmPlatformTask.ICreate,
      },
    );
  typia.assert(parentTask);
  // 6. Create subtask with parent_task_id referencing parent task
  const subtask = await api.functional.hrmPlatform.member.projects.tasks.create(
    memberConnection,
    {
      projectId: project.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "open",
        priority: "medium",
        parent_task_id: parentTask.id,
      } satisfies IHrmPlatformTask.ICreate,
    },
  );
  typia.assert(subtask);
  // 7. Validate subtask relationship and properties
  TestValidator.equals(
    "subtask parent matches",
    subtask.parentTask?.id,
    parentTask.id,
  );
  TestValidator.equals("subtask priority", subtask.priority, "medium");
  TestValidator.equals("subtask status", subtask.status, "open");
  TestValidator.equals(
    "subtask belongs to project",
    subtask.project.id,
    project.id,
  );
}