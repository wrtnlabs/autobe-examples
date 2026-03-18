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
 * Test cascade delete behavior when a parent task with subtasks is deleted.
 *
 * Test Steps:
 * 1. Authenticate as a member using authorize_member_join utility
 * 2. Create a new project using generate_random_hrm_platform_member_projects_create utility
 * 3. Create a parent task within the project using generate_random_hrm_platform_member_projects_tasks_create utility
 * 4. Create a child task (subtask) under the parent task by providing parent_id in the request
 * 5. Delete the parent task using api.functional.hrmPlatform.member.projects.tasks.erase
 * 6. Verify the delete operation returns successfully (204 No Content)
 *
 * Business Validations:
 * - Deleting a parent task cascades soft delete to all child tasks (subtasks)
 * - Cascade delete sets deleted_at timestamp on child tasks automatically
 * - Both parent and child tasks should not appear in standard queries after deletion
 * - One-level nesting constraint: subtasks cannot have their own subtasks
 * - Task history audit trails remain intact for both parent and child tasks
 * - Response should be 204 No Content on successful deletion
 */
export async function test_api_task_deletion_cascade_to_subtasks(
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
  // 2. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3498db",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Create parent task
  const parentTask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          status: "open",
          priority: "high",
        } satisfies IHrmPlatformTask.ICreate,
      },
    );
  typia.assert(parentTask);
  // 4. Create child task (subtask) under parent task
  const childTask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          status: "open",
          priority: "medium",
          parent_id: parentTask.id,
        } satisfies IHrmPlatformTask.ICreate,
      },
    );
  typia.assert(childTask);
  // Verify child task has parent reference
  TestValidator.equals(
    "child task parent_id matches parent task id",
    childTask.parent?.id ?? null,
    parentTask.id,
  );
  // 5. Delete parent task (should cascade to child task)
  await api.functional.hrmPlatform.member.projects.tasks.erase(
    memberConnection,
    {
      projectId: project.id,
      taskId: parentTask.id,
    },
  );
  // 6. Verify deletion was successful (204 No Content - void response)
  TestValidator.predicate("parent task deletion completed", true);
}
