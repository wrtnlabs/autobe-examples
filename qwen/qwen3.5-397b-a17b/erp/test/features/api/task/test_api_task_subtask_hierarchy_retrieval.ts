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
 * Test subtask hierarchy retrieval with parent task relationship validation.
 *
 * Validates the complete subtask creation and retrieval flow including member authentication, organization setup, project creation, parent task creation, subtask creation with parent_task_id reference, and successful retrieval of the subtask with parentTask field populated. Ensures that the one-level subtask hierarchy business rule is enforced - subtasks cannot have their own subtasks.
 *
 * The test verifies that when retrieving a subtask, the parentTask field contains the parent task's summary information (id, title, status, priority, created_at). It also confirms that the parent task's subtasks array includes the child subtask, and that the subtask's parentTask does not itself have a parentTask (null value), enforcing the one-level nesting constraint.
 *
 * 1. Member registers with email and password credentials.
 * 2. Organization is created with name, currency, timezone, and fiscal settings.
 * 3. Project is created within the organization with name and color.
 * 4. Parent task is created with title, priority, and status.
 * 5. Subtask is created with parent_task_id referencing the parent task.
 * 6. Subtask is retrieved and validated for parentTask field population.
 * 7. Validates parentTask contains correct summary fields and has null parentTask.
 */
export async function test_api_task_subtask_hierarchy_retrieval(
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
  typia.assert(organization);
  // 3. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 4. Create parent task
  const parentTask =
    await generate_random_hrm_platform_member_projects_tasks_create(
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
          status: "open",
        },
      },
    );
  typia.assert(parentTask);
  // 5. Create subtask with parent_task_id
  const subtask =
    await generate_random_hrm_platform_member_projects_tasks_create(
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
          status: "open",
          parent_task_id: parentTask.id,
        },
      },
    );
  typia.assert(subtask);
  // 6. Retrieve subtask
  const retrievedSubtask =
    await api.functional.hrmPlatform.member.projects.tasks.at(
      memberConnection,
      {
        projectId: project.id,
        taskId: subtask.id,
      },
    );
  typia.assert(retrievedSubtask);
  // 7. Validate subtask hierarchy
  TestValidator.equals("subtask id matches", retrievedSubtask.id, subtask.id);
  TestValidator.equals(
    "subtask title matches",
    retrievedSubtask.title,
    subtask.title,
  );
  TestValidator.predicate(
    "parentTask exists",
    retrievedSubtask.parentTask !== null &&
      retrievedSubtask.parentTask !== undefined,
  );
  // Validate parentTask contains correct summary fields
  const parentTaskSummary = retrievedSubtask.parentTask!;
  TestValidator.equals(
    "parentTask id matches parent",
    parentTaskSummary.id,
    parentTask.id,
  );
  TestValidator.equals(
    "parentTask title matches",
    parentTaskSummary.title,
    parentTask.title,
  );
  TestValidator.equals(
    "parentTask status matches",
    parentTaskSummary.status,
    parentTask.status,
  );
  TestValidator.equals(
    "parentTask priority matches",
    parentTaskSummary.priority,
    parentTask.priority,
  );
  // Validate one-level hierarchy: parentTask should not have its own parentTask
  TestValidator.predicate(
    "parentTask has no parent (one-level hierarchy)",
    parentTaskSummary.parentTask === null,
  );
  // Validate subtask appears in parent task's subtasks array
  TestValidator.predicate(
    "subtask in parent's subtasks array",
    parentTask.subtasks.some((s) => s.id === subtask.id),
  );
}
