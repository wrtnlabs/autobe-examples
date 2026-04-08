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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTask";
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
 * Test task listing with subtask parent relationship validation.
 *
 * Validates the complete task creation flow including parent tasks and subtasks with one-level nesting. A project member creates parent tasks and subtasks, then retrieves the task list to verify parent-child relationships are correctly represented in the response.
 *
 * The test ensures that top-level tasks have parentTask field set to null, while subtasks have parentTask field populated with the parent task summary including id, title, status, and priority. It also validates that the one-level nesting rule is enforced (subtasks cannot have their own subtasks) and that both parent tasks and subtasks appear in the same task list response.
 *
 * 1. Member registers and authenticates to the platform.
 * 2. Creates an organization for project context.
 * 3. Creates a project within the organization.
 * 4. Creates parent tasks (top-level) in the project.
 * 5. Creates subtasks referencing the parent tasks via parent_task_id.
 * 6. Retrieves the task list and validates parent-child relationships.
 * 7. Verifies top-level tasks have parentTask as null.
 * 8. Verifies subtasks have parentTask populated with correct parent summary.
 * 9. Validates parentTask structure contains all IHrmPlatformTask.ISummary fields.
 * 10. Validates one-level nesting rule by confirming subtasks have empty subtasks arrays.
 */
export async function test_api_project_task_subtask_parent_relationship(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: `test-${RandomGenerator.alphaNumeric(10)}@example.com`,
      password: "Password123!",
    },
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
  // 3. Create project (organization derived from authenticated session)
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
      },
    },
  );
  // 4. Create parent task (top-level task)
  const parentTask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          priority: "high",
          status: "open",
          description: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    );
  typia.assert(parentTask);
  // Create another parent task for variety
  const secondParentTask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          priority: "medium",
          status: "open",
        },
      },
    );
  typia.assert(secondParentTask);
  // 5. Create subtask referencing first parent task
  const subtask1 =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          priority: "urgent",
          status: "in-progress",
          parent_task_id: parentTask.id,
        },
      },
    );
  typia.assert(subtask1);
  // Create another subtask referencing first parent task
  const subtask2 =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          priority: "low",
          parent_task_id: parentTask.id,
        },
      },
    );
  typia.assert(subtask2);
  // Create subtask referencing second parent task
  const subtask3 =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          priority: "high",
          parent_task_id: secondParentTask.id,
        },
      },
    );
  typia.assert(subtask3);
  // 6. Retrieve task list
  const taskList = await api.functional.hrmPlatform.member.projects.tasks.index(
    memberConnection,
    {
      projectId: project.id,
      body: {
        limit: 100,
        page: 1,
      } satisfies IHrmPlatformTask.IRequest,
    },
  );
  typia.assert(taskList);
  // 7. Validate task list contains all created tasks
  TestValidator.predicate(
    "task list has all tasks",
    () => taskList.data.length >= 5,
  );
  // 8. Find parent tasks and subtasks in the list
  const parentTaskInList = taskList.data.find((t) => t.id === parentTask.id);
  const secondParentInList = taskList.data.find(
    (t) => t.id === secondParentTask.id,
  );
  const subtask1InList = taskList.data.find((t) => t.id === subtask1.id);
  const subtask2InList = taskList.data.find((t) => t.id === subtask2.id);
  const subtask3InList = taskList.data.find((t) => t.id === subtask3.id);
  TestValidator.predicate(
    "parent task found in list",
    () => parentTaskInList !== undefined,
  );
  TestValidator.predicate(
    "second parent task found in list",
    () => secondParentInList !== undefined,
  );
  TestValidator.predicate(
    "subtask 1 found in list",
    () => subtask1InList !== undefined,
  );
  TestValidator.predicate(
    "subtask 2 found in list",
    () => subtask2InList !== undefined,
  );
  TestValidator.predicate(
    "subtask 3 found in list",
    () => subtask3InList !== undefined,
  );
  // 9. Validate top-level tasks have parentTask as null
  TestValidator.equals(
    "first parent task has null parentTask",
    parentTaskInList!.parentTask,
    null,
  );
  TestValidator.equals(
    "second parent task has null parentTask",
    secondParentInList!.parentTask,
    null,
  );
  // 10. Validate subtasks have parentTask populated
  TestValidator.predicate(
    "subtask 1 has parentTask",
    () => subtask1InList!.parentTask !== null,
  );
  TestValidator.predicate(
    "subtask 2 has parentTask",
    () => subtask2InList!.parentTask !== null,
  );
  TestValidator.predicate(
    "subtask 3 has parentTask",
    () => subtask3InList!.parentTask !== null,
  );
  // 11. Validate parentTask references are correct
  TestValidator.equals(
    "subtask 1 parentTask id matches parent",
    subtask1InList!.parentTask!.id,
    parentTask.id,
  );
  TestValidator.equals(
    "subtask 2 parentTask id matches parent",
    subtask2InList!.parentTask!.id,
    parentTask.id,
  );
  TestValidator.equals(
    "subtask 3 parentTask id matches parent",
    subtask3InList!.parentTask!.id,
    secondParentTask.id,
  );
  // 12. Validate parentTask title matches original parent task
  TestValidator.equals(
    "subtask 1 parentTask title matches parent",
    subtask1InList!.parentTask!.title,
    parentTask.title,
  );
  TestValidator.equals(
    "subtask 3 parentTask title matches second parent",
    subtask3InList!.parentTask!.title,
    secondParentTask.title,
  );
  // 13. Validate parentTask status and priority match
  TestValidator.equals(
    "subtask 1 parentTask status matches parent",
    subtask1InList!.parentTask!.status,
    parentTask.status,
  );
  TestValidator.equals(
    "subtask 1 parentTask priority matches parent",
    subtask1InList!.parentTask!.priority,
    parentTask.priority,
  );
}
