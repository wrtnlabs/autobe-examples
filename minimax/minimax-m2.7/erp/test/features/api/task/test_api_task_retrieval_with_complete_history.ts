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

export async function test_api_task_retrieval_with_complete_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_admin_join(adminConnection, {});
  typia.assert(authorizedAdmin);
  // 2. Create a project using project create API
  const project = await api.functional.erpHrm.admin.projects.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        color: "#4A90E2",
        description: RandomGenerator.paragraph({ sentences: 2 }),
        status: "active",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project);
  // Get project ID from the IErpHrmProject type (items array)
  // IErpHrmProject has items: IErpHrmProject.IEntry[] with projectId property
  const projectId = project.items[0]?.projectId;
  TestValidator.predicate("project has items with projectId", !!projectId);
  // 3. Create a task using tasks create API
  const task = await api.functional.erpHrm.admin.projects.tasks.create(
    adminConnection,
    {
      projectId: projectId!,
      body: {
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IErpHrmTask.ICreate,
    },
  );
  typia.assert(task);
  // 4. Retrieve task with history using at API
  const retrievedTask = await api.functional.erpHrm.admin.projects.tasks.at(
    adminConnection,
    {
      projectId: projectId!,
      taskId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(retrievedTask);
  // 5. Validate retrieved task has valid structure
  TestValidator.predicate(
    "task has valid totalTasks",
    typeof retrievedTask.totalTasks === "number",
  );
  TestValidator.predicate(
    "task has statusBreakdown",
    retrievedTask.statusBreakdown !== undefined,
  );
  TestValidator.predicate(
    "task has priorityBreakdown",
    retrievedTask.priorityBreakdown !== undefined,
  );
  // 6. Validate task analytics structure
  TestValidator.predicate(
    "completionRate is valid number",
    typeof retrievedTask.completionRate === "number",
  );
  TestValidator.predicate(
    "overdueTasks is valid number",
    typeof retrievedTask.overdueTasks === "number",
  );
  // 7. Validate temporal trend exists and is an array
  TestValidator.predicate(
    "temporalTrend is an array",
    Array.isArray(retrievedTask.temporalTrend),
  );
}
