import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_admin_projects_tasks_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

/**
 * Test updating a task's title, description, priority, and status attributes as an authenticated admin.
 *
 * Steps:
 * 1. Authenticate as admin via POST /erpHrm/auth/admin/join
 * 2. Create a project via POST /erpHrm/admin/projects
 * 3. Create a task via POST /erpHrm/admin/projects/{projectId}/tasks
 * 4. Update the task via PUT /erpHrm/admin/projects/{projectId}/tasks/{taskId}
 *    with new title, description, priority changed from medium to high,
 *    and status changed from open to in-progress
 *
 * Validation:
 * - Response returns updated task entity
 * - Title, description, priority, and status reflect the new values
 */
export async function test_api_task_update_by_admin_attributes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // 2. Create a project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#" + RandomGenerator.alphaNumeric(6).toUpperCase(),
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 3. Create a task with medium priority and open status
  const task = await generate_random_erp_hrm_admin_projects_tasks_create(
    adminConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        priority: "medium",
        status: "open",
      } satisfies IErpHrmTask.ICreate,
    },
  );
  typia.assert(task);
  // Store original values for comparison
  const originalTitle = task.title;
  const originalCreatedAt = task.created_at;
  // 4. Update the task with new title, description, priority (medium -> high), and status (open -> in-progress)
  const updatedTask = await api.functional.erpHrm.admin.projects.tasks.update(
    adminConnection,
    {
      projectId: project.id,
      taskId: task.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        priority: "high",
        status: "in-progress",
      } satisfies IErpHrmTask.IUpdate,
    },
  );
  typia.assert(updatedTask);
  // Validation: Title updated
  TestValidator.notEquals("title changed", updatedTask.title, originalTitle);
  // Validation: Description updated
  TestValidator.predicate(
    "description updated",
    updatedTask.description !== undefined && updatedTask.description !== null,
  );
  // Validation: Priority changed from medium to high
  TestValidator.equals(
    "priority changed to high",
    updatedTask.priority,
    "high",
  );
  // Validation: Status changed from open to in-progress
  TestValidator.equals(
    "status changed to in-progress",
    updatedTask.status,
    "in-progress",
  );
  // Validation: created_at unchanged
  TestValidator.equals(
    "created_at unchanged",
    updatedTask.created_at,
    originalCreatedAt,
  );
  // Validation: updated_at is set
  TestValidator.predicate(
    "updated_at is set",
    updatedTask.updated_at !== undefined && updatedTask.updated_at !== null,
  );
}
