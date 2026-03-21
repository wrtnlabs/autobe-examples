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

export async function test_api_task_retrieval_by_admin_with_project_manage_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin with project:manage permission
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a project that will contain the task to be retrieved
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {},
    },
  );
  typia.assert(project);
  // 3. Create a task within the project before retrieving it by ID
  const task = await generate_random_erp_hrm_admin_projects_tasks_create(
    adminConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {},
    },
  );
  typia.assert(task);
  // 4. Retrieve the created task via GET /admin/projects/{projectId}/tasks/{taskId}
  const retrievedTask = await api.functional.erpHrm.admin.projects.tasks.at(
    adminConnection,
    {
      projectId: project.id,
      taskId: task.id,
    },
  );
  typia.assert(retrievedTask);
  // Validate response returns complete task entity with all attributes
  TestValidator.equals("task id matches", retrievedTask.id, task.id);
  TestValidator.equals("task title matches", retrievedTask.title, task.title);
  TestValidator.equals(
    "project context included",
    retrievedTask.project.id,
    project.id,
  );
  TestValidator.predicate(
    "subtasks array exists",
    Array.isArray(retrievedTask.subtasks),
  );
  TestValidator.predicate(
    "taskHistories array exists",
    Array.isArray(retrievedTask.taskHistories),
  );
  TestValidator.predicate(
    "timelogs array exists",
    Array.isArray(retrievedTask.timelogs),
  );
  TestValidator.predicate(
    "timers array exists",
    Array.isArray(retrievedTask.timers),
  );
}
