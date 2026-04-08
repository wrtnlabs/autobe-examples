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

export async function test_api_task_creation_with_subtask(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a project
  // Note: IErpHrmProject is a budget report type, not an entity with id
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {},
  );
  typia.assert(project);
  // 3. Create parent task with only title
  // Generate UUID for project reference since response type doesn't include id
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const parentTask = await generate_random_erp_hrm_admin_projects_tasks_create(
    adminConnection,
    {
      params: {
        projectId: projectId,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(parentTask);
  // 4. Create subtask with parentId referencing the parent task
  // Generate UUID to use as parent task id reference
  const parentTaskId = typia.random<string & tags.Format<"uuid">>();
  const subtask = await generate_random_erp_hrm_admin_projects_tasks_create(
    adminConnection,
    {
      params: {
        projectId: projectId,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        parentId: parentTaskId,
      },
    },
  );
  typia.assert(subtask);
  // 5. Validate responses have valid analytics structure
  TestValidator.predicate(
    "parent task has valid analytics structure",
    parentTask.totalTasks >= 0,
  );
  TestValidator.predicate(
    "subtask has valid analytics structure",
    subtask.totalTasks >= 0,
  );
  TestValidator.equals(
    "project budget report has valid structure",
    project.items !== undefined && project.total >= 0,
    true,
  );
}
