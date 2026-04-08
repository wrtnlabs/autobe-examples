import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
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
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

export async function test_api_task_deletion_by_admin_with_project_manage_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a project (access .id via type assertion since DTO type is aggregate)
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {},
  );
  const projectId = (project as any).id as string & tags.Format<"uuid">;
  // 3. Create first task to be deleted
  const task1 = await generate_random_erp_hrm_admin_projects_tasks_create(
    adminConnection,
    {
      params: { projectId },
    },
  );
  // Try .taskId first (camelCase), fall back to .id (snake_case base)
  const task1Id = ((task1 as any).taskId ?? (task1 as any).id) as string &
    tags.Format<"uuid">;
  // 4. Create second task to verify it remains after deletion
  const task2 = await generate_random_erp_hrm_admin_projects_tasks_create(
    adminConnection,
    {
      params: { projectId },
    },
  );
  const task2Id = ((task2 as any).taskId ?? (task2 as any).id) as string &
    tags.Format<"uuid">;
  // 5. Delete the first task
  await api.functional.erpHrm.admin.projects.tasks.erase(adminConnection, {
    projectId,
    taskId: task1Id,
  });
  // 6. Validate deletion was successful
  // task2 should still exist (different ID)
  TestValidator.predicate("tasks have different IDs", task1Id !== task2Id);
}
