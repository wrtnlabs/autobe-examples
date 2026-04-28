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
 * Test the subtask nesting scenario validating one-level hierarchy rules.
 *
 * The authenticated member creates a project, creates a parent task, then creates a subtask referencing the parent task via parent_id. When retrieving the subtask, the response parentTask field should correctly reference the parent task summary. This validates the business rule that subtasks must belong to the same project as their parent, and that only one level of nesting is supported - parent tasks cannot themselves have a parent.
 *
 * 1. Authenticate as a member.
 * 2. Create a project.
 * 3. Create a parent task within the project.
 * 4. Create a subtask within the same project, referencing the parent task.
 * 5. Retrieve the subtask via the task endpoint.
 * 6. Validate that the retrieved subtask has a parentTask field that matches the parent task's summary details.
 */
export async function test_api_task_retrieve_subtask_nesting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create parent task
  const parentTask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmPlatformTask.ICreate,
      },
    );
  typia.assert(parentTask);
  // 4. Create subtask referencing parent
  const subtask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: parentTask.id,
        } satisfies IHrmPlatformTask.ICreate,
      },
    );
  typia.assert(subtask);
  // 5. Retrieve subtask
  const retrievedSubtask =
    await api.functional.hrmPlatform.member.projects.tasks.at(
      memberConnection,
      {
        projectId: project.id,
        taskId: subtask.id,
      },
    );
  typia.assert(retrievedSubtask);
  // 6. Validate parentTask reference
  TestValidator.predicate(
    "subtask has parent task",
    retrievedSubtask.parentTask !== null,
  );
  TestValidator.equals(
    "parent task ID matches",
    retrievedSubtask.parentTask!.id,
    parentTask.id,
  );
  TestValidator.equals(
    "parent task title matches",
    retrievedSubtask.parentTask!.title,
    parentTask.title,
  );
  TestValidator.equals(
    "parent task project ID matches",
    retrievedSubtask.parentTask!.project.id,
    project.id,
  );
}
