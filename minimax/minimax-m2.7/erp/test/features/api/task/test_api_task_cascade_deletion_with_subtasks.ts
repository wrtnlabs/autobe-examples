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

export async function test_api_task_cascade_deletion_with_subtasks(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a project to house the tasks
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {},
  );
  typia.assert(project);
  // 3. Create parent task
  const parentTask = await generate_random_erp_hrm_admin_projects_tasks_create(
    adminConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        priority: "medium",
      },
    },
  );
  typia.assert(parentTask);
  // 4. Create subtask with parent_id reference
  const subtask = await generate_random_erp_hrm_admin_projects_tasks_create(
    adminConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        priority: "low",
        parent_id: parentTask.id,
      },
    },
  );
  typia.assert(subtask);
  // 5. Delete the parent task (cascade deletes subtask and task histories)
  await api.functional.erpHrm.admin.projects.tasks.erase(adminConnection, {
    projectId: project.id,
    taskId: parentTask.id,
  });
  // 6. Verify subtask is also deleted (cascade deletion)
  // Try to delete subtask again - should fail with 404 since it was cascade deleted
  await TestValidator.error("subtask should be cascade deleted", async () => {
    await api.functional.erpHrm.admin.projects.tasks.erase(adminConnection, {
      projectId: project.id,
      taskId: subtask.id,
    });
  });
  // 7. Verify parent task is deleted (try to delete again)
  await TestValidator.error("parent task should be deleted", async () => {
    await api.functional.erpHrm.admin.projects.tasks.erase(adminConnection, {
      projectId: project.id,
      taskId: parentTask.id,
    });
  });
}
