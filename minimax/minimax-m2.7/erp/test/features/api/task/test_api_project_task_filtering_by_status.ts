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

export async function test_api_project_task_filtering_by_status(
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
  typia.assert(project);
  // 3. Create tasks with different statuses
  const statuses: Array<"open" | "in-progress" | "completed" | "closed"> = [
    "open",
    "in-progress",
    "completed",
    "closed",
  ];
  const createdTasks: Array<{
    id: string;
    status: string;
    title: string;
  }> = [];
  for (const status of statuses) {
    const task = await generate_random_erp_hrm_admin_projects_tasks_create(
      adminConnection,
      {
        body: {
          title: `Task ${status}`,
          priority: "medium",
          status: status,
        } satisfies IErpHrmTask.ICreate,
        params: { projectId: project.id },
      },
    );
    typia.assert(task);
    createdTasks.push({ id: task.id, status: task.status, title: task.title });
  }
  // 4. Call listing endpoint with status filter set to 'in-progress'
  const filteredResponse =
    await api.functional.erpHrm.admin.projects.tasks.index(adminConnection, {
      projectId: project.id,
      body: {
        status: "in-progress",
      } satisfies IErpHrmTask.IRequest,
    });
  typia.assert(filteredResponse);
  // 5. Verify only tasks with matching status are returned
  TestValidator.equals("has data", filteredResponse.data.length > 0, true);
  TestValidator.equals(
    "pagination records >= filtered tasks",
    filteredResponse.pagination.records >= filteredResponse.data.length,
    true,
  );
  // Verify all returned tasks have status 'in-progress'
  for (const task of filteredResponse.data) {
    TestValidator.equals(
      "task status is in-progress",
      task.status,
      "in-progress",
    );
    TestValidator.predicate("task has valid id", task.id.length > 0);
    TestValidator.predicate(
      "task has valid priority",
      ["low", "medium", "high", "urgent"].includes(task.priority),
    );
    TestValidator.predicate("task has valid title", task.title.length > 0);
  }
  // Verify that other statuses are excluded
  const nonInProgressTasks = filteredResponse.data.filter(
    (task) => task.status !== "in-progress",
  );
  TestValidator.equals(
    "no non-in-progress tasks returned",
    nonInProgressTasks.length,
    0,
  );
  // Verify our created 'in-progress' task is in the results
  const inProgressTaskIds = createdTasks
    .filter((t) => t.status === "in-progress")
    .map((t) => t.id);
  const foundInProgressTask = filteredResponse.data.some((task) =>
    inProgressTaskIds.includes(task.id),
  );
  TestValidator.equals(
    "created in-progress task found in results",
    foundInProgressTask,
    true,
  );
}
