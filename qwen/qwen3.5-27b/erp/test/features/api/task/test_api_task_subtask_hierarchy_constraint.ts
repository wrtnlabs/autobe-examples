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
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Test subtask creation and one-level hierarchy constraint enforcement.
 *
 * This test verifies that the task system enforces proper subtask hierarchy rules:
 * - Only one level of subtask nesting is allowed
 * - Parent tasks cannot themselves be subtasks
 * - Subtasks must belong to the same project as their parent
 * - Updates preserve parent_task_id when not explicitly changed
 */
export async function test_api_task_subtask_hierarchy_constraint(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Setup: Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Setup: Create a parent task (not a subtask)
  const parentTask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: "Parent Task - No Subtask",
          description: "This is a parent task that can have subtasks",
          status: "open",
          priority: "high",
        },
      },
    );
  typia.assert(parentTask);
  TestValidator.equals(
    "parent task has no parent",
    parentTask.parentTask,
    null,
  );
  // 4. Test: Create a child task with parent_task_id set to parent task ID
  const childTask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: "Child Task - Subtask of Parent",
          description: "This is a subtask",
          status: "open",
          priority: "medium",
          parent_task_id: parentTask.id,
        },
      },
    );
  typia.assert(childTask);
  TestValidator.equals(
    "child task has correct parent",
    childTask.parentTask?.id,
    parentTask.id,
  );
  // 5. Test: Update child task properties without changing parent_task_id
  const updatedChildTask = await api.functional.hrmPlatform.member.tasks.update(
    memberConnection,
    {
      taskId: childTask.id,
      body: {
        title: "Updated Child Task Title",
        priority: "urgent",
      },
    },
  );
  typia.assert(updatedChildTask);
  TestValidator.equals(
    "update preserves parent_task_id",
    updatedChildTask.parentTask?.id,
    parentTask.id,
  );
  TestValidator.equals(
    "update changes title",
    updatedChildTask.title,
    "Updated Child Task Title",
  );
  TestValidator.equals(
    "update changes priority",
    updatedChildTask.priority,
    "urgent",
  );
  // 6. Negative Test: Attempt to create a subtask of a subtask (grandchild task)
  await TestValidator.error("cannot create subtask of subtask", async () => {
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: "Grandchild Task - Should Fail",
          description: "This should be rejected",
          status: "open",
          priority: "low",
          parent_task_id: childTask.id, // childTask already has a parent
        },
      },
    );
  });
  // 7. Negative Test: Attempt to create task with parent from different project
  const otherProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(otherProject);
  const otherProjectTask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: otherProject.id },
        body: {
          title: "Task in Other Project",
          description: "This task is in a different project",
          status: "open",
          priority: "low",
        },
      },
    );
  typia.assert(otherProjectTask);
  await TestValidator.error(
    "cannot create subtask with parent from different project",
    async () => {
      await generate_random_hrm_platform_member_projects_tasks_create(
        memberConnection,
        {
          params: { projectId: project.id },
          body: {
            title: "Cross-Project Subtask - Should Fail",
            description: "This should be rejected",
            status: "open",
            priority: "low",
            parent_task_id: otherProjectTask.id, // from different project
          },
        },
      );
    },
  );
  // 8. Negative Test: Attempt circular reference
  // Create task A
  const taskA = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: "Task A - Circular Test",
        description: "Task A for circular reference test",
        status: "open",
        priority: "medium",
      },
    },
  );
  typia.assert(taskA);
  // Create task B as subtask of A
  const taskB = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: "Task B - Subtask of A",
        description: "Task B for circular reference test",
        status: "open",
        priority: "medium",
        parent_task_id: taskA.id,
      },
    },
  );
  typia.assert(taskB);
  // Attempt to make task A a subtask of task B (circular)
  await TestValidator.error("cannot create circular reference", async () => {
    await api.functional.hrmPlatform.member.tasks.update(memberConnection, {
      taskId: taskA.id,
      body: {
        parent_task_id: taskB.id, // taskB is already subtask of taskA
      },
    });
  });
}
