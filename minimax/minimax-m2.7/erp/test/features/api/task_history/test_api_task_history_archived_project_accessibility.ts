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

export async function test_api_task_history_archived_project_accessibility(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create an active project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 3. Create a task
  const task = await generate_random_erp_hrm_admin_projects_tasks_create(
    adminConnection,
    {
      params: {
        projectId: project.id,
      },
    },
  );
  typia.assert(task);
  // Store initial status for validation
  const initialStatus = task.status;
  // 4. Update task status to in-progress (creates history entry)
  const updatedTask = await api.functional.erpHrm.admin.projects.tasks.update(
    adminConnection,
    {
      projectId: project.id,
      taskId: task.id,
      body: {
        status: "in-progress",
      } satisfies IErpHrmTask.IUpdate,
    },
  );
  typia.assert(updatedTask);
  // 5. Archive the project
  const archivedProject = await api.functional.erpHrm.admin.projects.update(
    adminConnection,
    {
      projectId: project.id,
      body: {
        status: "archived",
      },
    },
  );
  typia.assert(archivedProject);
  TestValidator.equals(
    "project is archived",
    archivedProject.status,
    "archived",
  );
  // 6. Retrieve task history after project is archived
  const taskHistoryResponse =
    await api.functional.erpHrm.admin.projects.tasks.histories.index(
      adminConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {} satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(taskHistoryResponse);
  // Validations
  // - Task history is successfully retrieved despite project being archived
  TestValidator.predicate(
    "task history response exists",
    taskHistoryResponse !== null,
  );
  TestValidator.predicate(
    "task history has data",
    taskHistoryResponse.data.length > 0,
  );
  // - History entry from before archival is preserved
  const historyEntry = taskHistoryResponse.data[0];
  TestValidator.equals(
    "previous status preserved",
    historyEntry.previous_status,
    initialStatus,
  );
  TestValidator.equals(
    "new status is in-progress",
    historyEntry.new_status,
    "in-progress",
  );
  // - Entries maintain chronological order (should be oldest first)
  for (let i = 1; i < taskHistoryResponse.data.length; i++) {
    const prev = taskHistoryResponse.data[i - 1];
    const curr = taskHistoryResponse.data[i];
    TestValidator.predicate(
      `history entry ${i} is after entry ${i - 1}`,
      prev.created_at <= curr.created_at,
    );
  }
  // - Historical integrity is maintained - member info exists in history
  TestValidator.predicate(
    "member info exists in history",
    historyEntry.member !== null,
  );
}
