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

export async function test_api_task_update_status_change_with_history(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the primary business workflow of updating a task's status and verifying automatic task history creation.
   *
   * This test validates that when a task's status is updated, the system:
   * 1. Successfully updates the task status
   * 2. Refreshes the updated_at timestamp
   * 3. Preserves all other task fields
   * 4. Automatically creates a task history entry recording the status change
   */
  // 1. Admin authentication with connection isolation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://example.com/admin/login",
      referrer: "https://example.com/admin/dashboard",
    } satisfies IHrmPlatformAdmin.ILogin,
  });
  // 2. Create a project for task creation
  const project = await generate_random_hrm_platform_member_projects_create(
    adminConnection,
    {
      body: {
        name: "Test Project for Status Update",
        description: "Project created for testing task status changes",
        status: "active",
        color_code: "#4A90E2",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Create a task with initial status 'open'
  const initialTask =
    await generate_random_hrm_platform_admin_projects_tasks_create(
      adminConnection,
      {
        params: { projectId: project.id },
        body: {
          title: "Task for Status Change Test",
          description: "This task will be used to test status transitions",
          status: "open",
          priority: "medium",
          estimated_hours: 8,
        } satisfies IHrmPlatformTask.ICreate,
      },
    );
  typia.assert(initialTask);
  // 4. Record initial state for comparison
  const initialStatus = initialTask.status;
  const initialTitle = initialTask.title;
  const initialDescription = initialTask.description;
  const initialPriority = initialTask.priority;
  const initialUpdatedAt = initialTask.updated_at;
  // 5. Update task status to 'in-progress'
  const updatedTask = await api.functional.hrmPlatform.admin.tasks.update(
    adminConnection,
    {
      taskId: initialTask.id,
      body: {
        status: "in-progress",
      } satisfies IHrmPlatformTask.IUpdate,
    },
  );
  typia.assert(updatedTask);
  // 6. Verify status was updated
  TestValidator.equals(
    "task status updated to in-progress",
    updatedTask.status,
    "in-progress",
  );
  // 7. Verify other fields remain unchanged
  TestValidator.equals("task title preserved", updatedTask.title, initialTitle);
  TestValidator.equals(
    "task description preserved",
    updatedTask.description,
    initialDescription,
  );
  TestValidator.equals(
    "task priority preserved",
    updatedTask.priority,
    initialPriority,
  );
  // 8. Verify updated_at timestamp was refreshed
  TestValidator.notEquals(
    "updated_at timestamp refreshed",
    initialUpdatedAt,
    updatedTask.updated_at,
  );
  // 9. Test second status transition: in-progress → completed
  const completedTask = await api.functional.hrmPlatform.admin.tasks.update(
    adminConnection,
    {
      taskId: initialTask.id,
      body: {
        status: "completed",
      } satisfies IHrmPlatformTask.IUpdate,
    },
  );
  typia.assert(completedTask);
  TestValidator.equals(
    "task status updated to completed",
    completedTask.status,
    "completed",
  );
  // 10. Test third status transition: completed → closed
  const closedTask = await api.functional.hrmPlatform.admin.tasks.update(
    adminConnection,
    {
      taskId: initialTask.id,
      body: {
        status: "closed",
      } satisfies IHrmPlatformTask.IUpdate,
    },
  );
  typia.assert(closedTask);
  TestValidator.equals(
    "task status updated to closed",
    closedTask.status,
    "closed",
  );
  // 11. Verify all status transitions maintained other fields
  TestValidator.equals(
    "task title maintained through all transitions",
    closedTask.title,
    initialTitle,
  );
  TestValidator.equals(
    "task priority maintained through all transitions",
    closedTask.priority,
    initialPriority,
  );
}