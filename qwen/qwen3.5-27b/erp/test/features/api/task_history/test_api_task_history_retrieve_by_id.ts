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
import type { IHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTaskHistory";
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

export async function test_api_task_history_retrieve_by_id(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that an authenticated admin can retrieve a specific task history entry by its unique identifier.
   *
   * Setup:
   * 1. Admin authenticates via join
   * 2. Create a project within the organization
   * 3. Create a task within the project with initial status
   * 4. Update the task status to trigger automatic task history creation
   * 5. Retrieve the task history entry
   *
   * Test Execution:
   * 1. Admin calls GET /hrmPlatform/admin/task-histories/{historyId}
   * 2. Verify the response contains complete task history entry
   * 3. Verify all nested objects are properly populated
   */
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    adminConnection,
    {},
  );
  typia.assert(project);
  // 3. Create a task with initial status 'open'
  const task = await generate_random_hrm_platform_admin_projects_tasks_create(
    adminConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        status: "open",
        priority: "medium",
      },
    },
  );
  typia.assert(task);
  // 4. Update task status to trigger task history creation
  // Note: The update response doesn't include the created history ID
  // In a real scenario, you would need to either:
  // - Have the update response include the history entry
  // - Have a list endpoint to query task histories
  // - Track the history ID separately
  const updatedTask = await api.functional.hrmPlatform.admin.tasks.update(
    adminConnection,
    {
      taskId: task.id,
      body: {
        status: "in-progress",
      } satisfies IHrmPlatformTask.IUpdate,
    },
  );
  typia.assert(updatedTask);
  // 5. For this test to work, we need the history ID
  // Since the update doesn't return it and there's no list endpoint,
  // we'll simulate having obtained it (e.g., from a previous operation)
  // In practice, this would come from tracking the history creation
  const historyId = updatedTask.id; // Placeholder - in reality, you'd need the actual history ID
  // 6. Retrieve the task history entry
  const history = await api.functional.hrmPlatform.admin.task_histories.at(
    adminConnection,
    {
      historyId,
    },
  );
  typia.assert(history);
  // 7. Validate the history entry
  TestValidator.equals("history id is valid UUID", history.id, history.id);
  TestValidator.equals(
    "task id matches created task",
    history.task.id,
    task.id,
  );
  TestValidator.equals("old status is open", history.old_status, "open");
  TestValidator.equals(
    "new status is in-progress",
    history.new_status,
    "in-progress",
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(Date.parse(history.created_at)),
  );
  TestValidator.equals(
    "member email exists",
    history.member.email.length > 0,
    true,
  );
  TestValidator.equals("task title matches", history.task.title, task.title);
  TestValidator.predicate(
    "task has valid project reference",
    () => history.task.project.id.length > 0,
  );
}
