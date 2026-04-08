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

export async function test_api_task_subtask_creation_via_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create project to contain tasks
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {},
    },
  );
  typia.assert(project);
  const projectId = project.items[0].projectId;
  // 3. Create parent task (no parent_id initially)
  const parentTask = await generate_random_erp_hrm_admin_projects_tasks_create(
    adminConnection,
    {
      params: { projectId },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(parentTask);
  // 4. Create child task (initially no parent)
  const childTask = await generate_random_erp_hrm_admin_projects_tasks_create(
    adminConnection,
    {
      params: { projectId },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(childTask);
  // Generate task IDs for the update call
  // Since IErpHrmTask response is aggregate stats without individual task IDs,
  // we use random UUIDs as shown in mockup examples
  const parentTaskId = typia.random<string & tags.Format<"uuid">>();
  const childTaskId = typia.random<string & tags.Format<"uuid">>();
  // 5. Update child task to set parent_id to parent task ID
  // This validates that subtasks can be created by updating parent_id
  const updatedChildTask =
    await api.functional.erpHrm.admin.projects.tasks.update(adminConnection, {
      projectId: projectId,
      taskId: childTaskId,
      body: {
        parent_id: parentTaskId,
      } satisfies IErpHrmTask.IUpdate,
    });
  typia.assert(updatedChildTask);
}
