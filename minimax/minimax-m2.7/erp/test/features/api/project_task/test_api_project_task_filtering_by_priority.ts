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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTask";
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

export async function test_api_project_task_filtering_by_priority(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a project to contain tasks
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {},
  );
  typia.assert(project);
  // 3. Create tasks with varying priorities
  const priorities = ["low", "medium", "high", "urgent"] as const;
  const createdTasks = await Promise.all(
    priorities.map(async (priority) => {
      const task = await generate_random_erp_hrm_admin_projects_tasks_create(
        adminConnection,
        {
          body: {
            title: `Test task priority ${priority}`,
            priority: priority,
          },
          params: {
            projectId: project.id,
          },
        },
      );
      typia.assert(task);
      return task;
    }),
  );
  // 4. Filter tasks by priority 'high' only
  const highPriorityTasks =
    await api.functional.erpHrm.admin.projects.tasks.index(adminConnection, {
      projectId: project.id,
      body: {
        priority: "high",
      } satisfies IErpHrmTask.IRequest,
    });
  typia.assert(highPriorityTasks);
  // 5. Validate filtering results
  // Find the high priority task we created
  const expectedHighTask = createdTasks.find((t) => t.priority === "high");
  TestValidator.equals(
    "high priority tasks count",
    highPriorityTasks.data.length,
    1,
  );
  TestValidator.equals(
    "task matches expected",
    highPriorityTasks.data[0]?.id,
    expectedHighTask?.id,
  );
  TestValidator.equals(
    "priority is high",
    highPriorityTasks.data[0]?.priority,
    "high",
  );
  // Verify no other priorities are included
  const otherPriorities = highPriorityTasks.data.filter(
    (t) => t.priority !== "high",
  );
  TestValidator.equals(
    "no other priorities included",
    otherPriorities.length,
    0,
  );
  // Verify project association is correct
  TestValidator.equals(
    "project matches",
    highPriorityTasks.data[0]?.project.id,
    project.id,
  );
}
