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

export async function test_api_project_task_listing_without_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a project to contain the tasks
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {},
  );
  // 3. Create multiple tasks with different statuses and priorities
  const statuses = ["open", "in-progress"] as const;
  const priorities = ["low", "high"] as const;
  const task1 = await generate_random_erp_hrm_admin_projects_tasks_create(
    adminConnection,
    {
      params: { projectId: project.id },
      body: {
        title: "Test Task 1 - Open/Low",
        status: statuses[0],
        priority: priorities[0],
      },
    },
  );
  typia.assert(task1);
  const task2 = await generate_random_erp_hrm_admin_projects_tasks_create(
    adminConnection,
    {
      params: { projectId: project.id },
      body: {
        title: "Test Task 2 - Open/High",
        status: statuses[0],
        priority: priorities[1],
      },
    },
  );
  typia.assert(task2);
  const task3 = await generate_random_erp_hrm_admin_projects_tasks_create(
    adminConnection,
    {
      params: { projectId: project.id },
      body: {
        title: "Test Task 3 - In-Progress/Low",
        status: statuses[1],
        priority: priorities[0],
      },
    },
  );
  typia.assert(task3);
  const task4 = await generate_random_erp_hrm_admin_projects_tasks_create(
    adminConnection,
    {
      params: { projectId: project.id },
      body: {
        title: "Test Task 4 - In-Progress/High",
        status: statuses[1],
        priority: priorities[1],
      },
    },
  );
  typia.assert(task4);
  // 4. Call the task listing endpoint with empty request body (no filters)
  const response = await api.functional.erpHrm.admin.projects.tasks.index(
    adminConnection,
    {
      projectId: project.id,
      body: {},
    },
  );
  typia.assert(response);
  // 5. Verify the response is paginated and contains data
  TestValidator.equals("response has data", response.data.length > 0, true);
  TestValidator.equals(
    "response has pagination",
    response.pagination !== null,
    true,
  );
  // 6. Verify all created tasks are included in the response
  const taskIds = response.data.map((t) => t.id);
  TestValidator.equals("task1 included", taskIds.includes(task1.id), true);
  TestValidator.equals("task2 included", taskIds.includes(task2.id), true);
  TestValidator.equals("task3 included", taskIds.includes(task3.id), true);
  TestValidator.equals("task4 included", taskIds.includes(task4.id), true);
  // 7. Verify all tasks belong to the correct project
  for (const task of response.data) {
    TestValidator.equals(
      "task project id matches",
      task.project.id,
      project.id,
    );
  }
  // 8. Verify pagination metadata shows total records
  TestValidator.equals(
    "pagination records >= 4",
    response.pagination.records >= 4,
    true,
  );
  TestValidator.predicate(
    "pagination current page is valid",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    response.pagination.limit >= 1,
  );
}
