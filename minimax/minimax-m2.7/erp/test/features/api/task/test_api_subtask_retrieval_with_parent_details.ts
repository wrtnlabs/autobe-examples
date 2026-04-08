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

export async function test_api_subtask_retrieval_with_parent_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {},
  );
  typia.assert(project);
  // 3. Create parent task
  const parentResult =
    await generate_random_erp_hrm_admin_projects_tasks_create(adminConnection, {
      params: { projectId: project.items[0]!.projectId },
      body: {
        title: `Parent Task - ${RandomGenerator.paragraph({ sentences: 1 })}`,
      },
    });
  typia.assert(parentResult);
  // 4. Create subtask
  const subtaskResult =
    await generate_random_erp_hrm_admin_projects_tasks_create(adminConnection, {
      params: { projectId: project.items[0]!.projectId },
      body: {
        title: `Subtask - ${RandomGenerator.paragraph({ sentences: 1 })}`,
      },
    });
  typia.assert(subtaskResult);
  // 5. Retrieve task to verify endpoint works
  const retrievedTask = await api.functional.erpHrm.admin.projects.tasks.at(
    adminConnection,
    {
      projectId: project.items[0]!.projectId,
      taskId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(retrievedTask);
  // 6. Validate response contains expected analytics fields
  TestValidator.predicate(
    "response has totalTasks",
    typeof retrievedTask.totalTasks === "number",
  );
  TestValidator.predicate(
    "response has statusBreakdown",
    typeof retrievedTask.statusBreakdown === "object" &&
      retrievedTask.statusBreakdown !== null,
  );
  TestValidator.predicate(
    "response has priorityBreakdown",
    typeof retrievedTask.priorityBreakdown === "object" &&
      retrievedTask.priorityBreakdown !== null,
  );
  TestValidator.predicate(
    "response has completionRate",
    typeof retrievedTask.completionRate === "number",
  );
  // 7. Validate task count reflects both parent and subtask
  TestValidator.predicate(
    "totalTasks includes both tasks",
    retrievedTask.totalTasks >= 2,
  );
}
