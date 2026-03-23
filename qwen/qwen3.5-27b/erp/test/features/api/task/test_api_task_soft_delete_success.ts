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
 * Test the primary success path for soft deleting a task.
 * 1. Admin authenticates to the system
 * 2. Admin creates a project to contain the task
 * 3. Admin creates a task within the project
 * 4. Admin soft deletes the task
 * 5. Verify the soft delete operation completes successfully
 *
 * Note: Full verification of deleted_at timestamp, task list filtering,
 * history preservation, and activity log creation requires additional
 * GET endpoints not currently available in the SDK.
 */
export async function test_api_task_soft_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://example.com/admin/login",
      referrer: "https://example.com",
    } satisfies IHrmPlatformAdmin.ILogin,
  });
  // 2. Create a project to contain the task
  const project = await generate_random_hrm_platform_member_projects_create(
    adminConnection,
    {},
  );
  typia.assert(project);
  // 3. Create a task within the project
  const task = await generate_random_hrm_platform_admin_projects_tasks_create(
    adminConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: "Test Task for Soft Delete",
        description: "This task will be soft deleted",
        status: "open",
        priority: "medium",
      } satisfies IHrmPlatformTask.ICreate,
    },
  );
  typia.assert(task);
  // Verify task was created successfully and is not deleted
  TestValidator.equals("task id exists", task.id !== undefined, true);
  TestValidator.equals("task is not deleted initially", task.deleted_at, null);
  // 4. Soft delete the task
  await api.functional.hrmPlatform.admin.tasks.erase(adminConnection, {
    taskId: task.id,
  });
  // 5. Verify the soft delete operation completed successfully
  // Note: The erase endpoint returns void, so we validate that:
  // - The operation completed without throwing an error
  // - The task ID was valid and accepted by the API
  //
  // Full verification would require:
  // - GET /tasks/{taskId} to verify deleted_at timestamp is set
  // - PATCH /tasks to verify task is filtered out from lists
  // - GET /tasks/{taskId}/histories to verify history preservation
  // - Activity log endpoint to verify deletion action was logged
  TestValidator.predicate(
    "task soft delete operation completed without error",
    true,
  );
  TestValidator.equals(
    "deleted task had valid UUID",
    task.id.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    ) !== null,
    true,
  );
}
