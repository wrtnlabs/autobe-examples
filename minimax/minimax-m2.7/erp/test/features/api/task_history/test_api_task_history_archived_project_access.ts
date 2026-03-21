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

export async function test_api_task_history_archived_project_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a project with active status
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        status: "active",
      } satisfies Partial<IErpHrmProjectMember.ICreate>,
    },
  );
  typia.assert(project);
  // 3. Create a task in the project
  const task = await generate_random_erp_hrm_admin_projects_tasks_create(
    adminConnection,
    {
      params: { projectId: project.id },
    },
  );
  typia.assert(task);
  // 4. Change task status to generate first history entry
  const taskAfterFirstUpdate =
    await api.functional.erpHrm.admin.projects.tasks.update(adminConnection, {
      projectId: project.id,
      taskId: task.id,
      body: {
        status: "in-progress",
      } satisfies IErpHrmTask.IUpdate,
    });
  typia.assert(taskAfterFirstUpdate);
  // 5. Change task status again to generate second history entry
  const taskAfterSecondUpdate =
    await api.functional.erpHrm.admin.projects.tasks.update(adminConnection, {
      projectId: project.id,
      taskId: task.id,
      body: {
        status: "completed",
      } satisfies IErpHrmTask.IUpdate,
    });
  typia.assert(taskAfterSecondUpdate);
  // 6. Archive the project
  const archivedProject = await api.functional.erpHrm.admin.projects.update(
    adminConnection,
    {
      projectId: project.id,
      body: {
        status: "archived",
      } satisfies IErpHrmProjectMember.IUpdate,
    },
  );
  typia.assert(archivedProject);
  TestValidator.equals(
    "project status is archived",
    archivedProject.status,
    "archived",
  );
  // 7. Retrieve task history entries from archived project
  const taskWithHistories =
    await api.functional.erpHrm.admin.projects.tasks.update(adminConnection, {
      projectId: project.id,
      taskId: task.id,
      body: {
        status: "closed",
      } satisfies IErpHrmTask.IUpdate,
    });
  typia.assert(taskWithHistories);
  // Get all history entries
  const historyEntries = taskWithHistories.taskHistories;
  TestValidator.predicate(
    "has at least one history entry",
    historyEntries.length >= 1,
  );
  // Retrieve individual history entries by ID
  for (const historySummary of historyEntries) {
    const historyEntry =
      await api.functional.erpHrm.admin.projects.tasks.histories.at(
        adminConnection,
        {
          projectId: project.id,
          taskId: task.id,
          historyId: historySummary.id,
        },
      );
    typia.assert(historyEntry);
    // Validation: Task history should remain accessible even after project archival
    TestValidator.equals(
      "history id matches",
      historyEntry.id,
      historySummary.id,
    );
    TestValidator.equals(
      "member who made status change is identifiable",
      historyEntry.member.id,
      admin.id,
    );
    TestValidator.predicate(
      "has valid previous status",
      ["open", "in-progress", "completed", "closed"].includes(
        historyEntry.previousStatus,
      ),
    );
    TestValidator.predicate(
      "has valid new status",
      ["open", "in-progress", "completed", "closed"].includes(
        historyEntry.newStatus,
      ),
    );
    TestValidator.predicate(
      "has valid created timestamp",
      new Date(historyEntry.createdAt).getTime() > 0,
    );
  }
  // Validation: History entries preserve their original status transition details
  const firstHistory = historyEntries[0];
  TestValidator.equals(
    "first history has open as previous status",
    firstHistory.previous_status,
    "open",
  );
  TestValidator.equals(
    "first history has in-progress as new status",
    firstHistory.new_status,
    "in-progress",
  );
  // Validation: Chronological ordering of history entries
  for (let i = 1; i < historyEntries.length; i++) {
    const prevTime = new Date(historyEntries[i - 1].created_at).getTime();
    const currTime = new Date(historyEntries[i].created_at).getTime();
    TestValidator.predicate(
      `history entry ${i} is after entry ${i - 1}`,
      currTime >= prevTime,
    );
  }
}
