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
import type { IPageIErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTaskHistory";
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

export async function test_api_task_history_retrieve_chronological_transitions(
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
  // 3. Create a task
  const task = await generate_random_erp_hrm_admin_projects_tasks_create(
    adminConnection,
    {
      params: { projectId: project.id },
    },
  );
  typia.assert(task);
  // 4. Update task status to 'in-progress' (first transition)
  const taskUpdatedToInProgress =
    await api.functional.erpHrm.admin.projects.tasks.update(adminConnection, {
      projectId: project.id,
      taskId: task.id,
      body: {
        status: "in-progress",
      } satisfies IErpHrmTask.IUpdate,
    });
  typia.assert(taskUpdatedToInProgress);
  // Wait a moment to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 5. Update task status to 'completed' (second transition)
  const taskUpdatedToCompleted =
    await api.functional.erpHrm.admin.projects.tasks.update(adminConnection, {
      projectId: project.id,
      taskId: task.id,
      body: {
        status: "completed",
      } satisfies IErpHrmTask.IUpdate,
    });
  typia.assert(taskUpdatedToCompleted);
  // 6. Retrieve task history
  const response =
    await api.functional.erpHrm.admin.projects.tasks.histories.index(
      adminConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {} satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(response);
  // 7. Validate pagination metadata is present
  TestValidator.predicate(
    "pagination metadata exists",
    response.pagination !== null && response.pagination !== undefined,
  );
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit exists",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records exists",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages exists",
    response.pagination.pages >= 0,
  );
  // 8. Validate history entries exist
  const historyEntries = response.data;
  TestValidator.equals(
    "has exactly 2 history entries",
    historyEntries.length,
    2,
  );
  // 9. Validate first entry: open -> in-progress
  const firstEntry = historyEntries[0]!;
  TestValidator.equals(
    "first entry previous_status is 'open'",
    firstEntry.previous_status,
    "open",
  );
  TestValidator.equals(
    "first entry new_status is 'in-progress'",
    firstEntry.new_status,
    "in-progress",
  );
  // 10. Validate second entry: in-progress -> completed
  const secondEntry = historyEntries[1]!;
  TestValidator.equals(
    "second entry previous_status is 'in-progress'",
    secondEntry.previous_status,
    "in-progress",
  );
  TestValidator.equals(
    "second entry new_status is 'completed'",
    secondEntry.new_status,
    "completed",
  );
  // 11. Validate each entry has member who made the change
  TestValidator.predicate(
    "first entry has member",
    firstEntry.member !== null && firstEntry.member !== undefined,
  );
  TestValidator.predicate(
    "second entry has member",
    secondEntry.member !== null && secondEntry.member !== undefined,
  );
  // 12. Validate chronological order (oldest first)
  const firstCreatedAt = new Date(firstEntry.created_at);
  const secondCreatedAt = new Date(secondEntry.created_at);
  TestValidator.predicate(
    "entries are in chronological order (oldest first)",
    firstCreatedAt <= secondCreatedAt,
  );
}
