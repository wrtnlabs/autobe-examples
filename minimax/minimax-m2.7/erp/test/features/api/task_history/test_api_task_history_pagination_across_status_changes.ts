import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

export async function test_api_task_history_pagination_across_status_changes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        color: "#3A7AFE",
        status: "active",
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  typia.assert(project);
  // 3. Create tasks with different statuses to simulate status changes
  // Each task creation generates a history entry for its initial status
  const taskStatuses = ["open", "in-progress", "completed", "closed"] as const;
  const tasks = await ArrayUtil.asyncMap(taskStatuses, async (status) => {
    const task = await generate_random_erp_hrm_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          priority: RandomGenerator.pick([
            "low",
            "medium",
            "high",
            "urgent",
          ] as const),
          status: status,
        },
      },
    );
    typia.assert(task);
    return task;
  });
  // 4. Get task history with pagination - test on first task
  const firstTask = tasks[0];
  const limit = 2;
  const page1 =
    await api.functional.erpHrm.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: firstTask.id,
        body: {
          limit: limit,
          page: 1,
        } satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(page1);
  // 5. Validate pagination metadata on first page
  TestValidator.equals(
    "page 1 has pagination data",
    page1.data.length > 0,
    true,
  );
  TestValidator.equals("page 1 current equals 1", page1.pagination.current, 1);
  TestValidator.equals(
    "page 1 limit matches request",
    page1.pagination.limit,
    limit,
  );
  TestValidator.predicate("page 1 has records", page1.pagination.records > 0);
  TestValidator.predicate("page 1 has pages", page1.pagination.pages > 0);
  // 6. Test second page if there are more records
  const page2 =
    await api.functional.erpHrm.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: firstTask.id,
        body: {
          limit: limit,
          page: 2,
        } satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(page2);
  // 7. Validate second page pagination
  TestValidator.equals("page 2 current equals 2", page2.pagination.current, 2);
  TestValidator.equals(
    "page 2 limit matches request",
    page2.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "page 2 records match page 1",
    page2.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "page 2 pages match page 1",
    page2.pagination.pages,
    page1.pagination.pages,
  );
  // 8. Validate chronological order across pages
  // Records should be ordered by createdAt ascending (oldest first)
  const allRecords = [...page1.data, ...page2.data];
  for (let i = 1; i < allRecords.length; i++) {
    const prevCreatedAt = new Date(allRecords[i - 1].createdAt).getTime();
    const currCreatedAt = new Date(allRecords[i].createdAt).getTime();
    TestValidator.predicate(
      `record ${i} createdAt >= record ${i - 1} createdAt`,
      currCreatedAt >= prevCreatedAt,
    );
  }
  // 9. Validate that history entries have correct structure
  for (const record of allRecords) {
    typia.assert(record);
    TestValidator.predicate("has valid id", record.id !== undefined);
    TestValidator.predicate(
      "has previousStatus",
      record.previousStatus !== undefined,
    );
    TestValidator.predicate("has newStatus", record.newStatus !== undefined);
    TestValidator.predicate("has member", record.member !== undefined);
    TestValidator.predicate("has createdAt", record.createdAt !== undefined);
  }
  // 10. Test with larger limit to get all history at once
  const allHistory =
    await api.functional.erpHrm.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: firstTask.id,
        body: {
          limit: 100,
          page: 1,
        } satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(allHistory);
  // 11. Validate single page contains all records
  TestValidator.equals(
    "all history records >= page1 records",
    allHistory.data.length >= page1.data.length,
    true,
  );
  TestValidator.equals(
    "all history records <= total records",
    allHistory.data.length <= allHistory.pagination.records,
    true,
  );
  TestValidator.equals(
    "all history pages is 1 or less",
    allHistory.pagination.pages <= 1,
    true,
  );
  // 12. Verify task status is correctly reflected in history
  // The first task was created with "open" status, so its initial history should show that transition
  if (allHistory.data.length > 0) {
    const latestHistory = allHistory.data[allHistory.data.length - 1];
    TestValidator.equals(
      "latest newStatus matches task status",
      latestHistory.newStatus,
      firstTask.status,
    );
  }
}