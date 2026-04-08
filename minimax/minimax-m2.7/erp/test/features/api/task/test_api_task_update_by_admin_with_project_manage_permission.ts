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

export async function test_api_task_update_by_admin_with_project_manage_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins the system
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {});
  typia.assert(authorized);
  // 2. Create a project to contain the task
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733",
      },
    },
  );
  typia.assert(project);
  // Extract project ID from the budget report items
  const projectId = project.items[0]?.projectId;
  TestValidator.predicate("project has budget info", projectId !== undefined);
  TestValidator.predicate("project items exist", project.items.length > 0);
  // 3. Create a task within the project
  const task = await generate_random_erp_hrm_admin_projects_tasks_create(
    adminConnection,
    {
      params: { projectId: projectId! },
    },
  );
  typia.assert(task);
  // 4. Update the task with new fields
  // Note: IErpHrmTask.IUpdate has snake_case properties
  const updatedTask = await api.functional.erpHrm.admin.projects.tasks.update(
    adminConnection,
    {
      projectId: projectId!,
      taskId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "in-progress",
        priority: "high",
        estimated_hours: typia.random<
          number & tags.Minimum<1> & tags.Maximum<100>
        >(),
        due_date: RandomGenerator.date(
          new Date(),
          1000 * 60 * 60 * 24 * 30,
        ).toISOString(),
      } satisfies IErpHrmTask.IUpdate,
    },
  );
  typia.assert(updatedTask);
  // 5. Validate the update response (aggregate task analytics)
  // Note: IErpHrmTask is an aggregate type with analytics data, not individual task fields
  TestValidator.predicate(
    "response has totalTasks",
    updatedTask.totalTasks >= 0,
  );
  TestValidator.predicate(
    "response has statusBreakdown",
    updatedTask.statusBreakdown !== undefined,
  );
  TestValidator.predicate(
    "response has priorityBreakdown",
    updatedTask.priorityBreakdown !== undefined,
  );
  TestValidator.predicate(
    "response has completionRate",
    updatedTask.completionRate >= 0 && updatedTask.completionRate <= 100,
  );
  TestValidator.predicate(
    "response has temporalTrend",
    Array.isArray(updatedTask.temporalTrend),
  );
}
