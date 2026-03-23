import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_admin_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_admin_projects_tasks_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Test creating a task as a subtask of an existing parent task, validating the one-level subtask hierarchy constraint.
 *
 * This test verifies:
 * 1. Subtasks can be created with a valid parent_task_id
 * 2. The parentTask relationship is properly established in the response
 * 3. One-level subtask hierarchy is enforced (subtasks cannot have their own subtasks)
 */
export async function test_api_task_creation_as_subtask(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Member authentication (for project creation)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 3. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 4. Create a parent task (no parent_task_id)
  const parentTask =
    await generate_random_hrm_platform_admin_projects_tasks_create(
      adminConnection,
      {
        params: { projectId: project.id },
        body: {
          title: "Parent Task: Implement user authentication",
          description: "Create login and registration functionality",
          status: "open",
          priority: "high",
          estimated_hours: 40,
        },
      },
    );
  typia.assert(parentTask);
  // Verify parent task has no parent
  TestValidator.equals(
    "parent task has no parent",
    parentTask.parentTask,
    null,
  );
  // 5. Create a subtask with parent_task_id
  const subtask =
    await generate_random_hrm_platform_admin_projects_tasks_create(
      adminConnection,
      {
        params: { projectId: project.id },
        body: {
          title: "Subtask: Database schema design",
          description: "Design database tables for user authentication",
          status: "open",
          priority: "high",
          estimated_hours: 16,
          parent_task_id: parentTask.id,
        },
      },
    );
  typia.assert(subtask);
  // 6. Validate subtask response
  TestValidator.predicate(
    "subtask has parent task",
    subtask.parentTask !== null,
  );
  // Type narrow parentTask to access properties safely
  typia.assertGuard(subtask.parentTask!);
  TestValidator.equals(
    "parent task id matches",
    subtask.parentTask!.id,
    parentTask.id,
  );
  TestValidator.equals(
    "parent task title matches",
    subtask.parentTask!.title,
    parentTask.title,
  );
  // 7. Attempt to create a second-level subtask (should fail)
  await TestValidator.error(
    "second-level subtask creation rejected",
    async () => {
      await api.functional.hrmPlatform.admin.projects.tasks.create(
        adminConnection,
        {
          projectId: project.id,
          body: {
            title: "Invalid: Second-level subtask",
            description: "This should be rejected",
            status: "open",
            priority: "low",
            parent_task_id: subtask.id, // subtask already has a parent
          } satisfies IHrmPlatformTask.ICreate,
        },
      );
    },
  );
}
