import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import type { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTaskHistoryEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_create";
import { generate_random_erp_hrm_time_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_tasks_create";
import { prepare_random_erp_hrm_time_project } from "../../../prepare/prepare_random_erp_hrm_time_project";
import { prepare_random_erp_hrm_time_task } from "../../../prepare/prepare_random_erp_hrm_time_task";

export async function test_api_task_history_entry_view_permission_denied(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "P@ssw0rd1234!";
  await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      name: RandomGenerator.name(),
      href: "https://example.com/erp-join",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const project = await generate_random_erp_hrm_time_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#3366FF",
        status: "active",
        budgetHours: 120,
        startDate: new Date().toISOString(),
        endDate: null,
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(project);
  const task = await generate_random_erp_hrm_time_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        priority: "medium",
        estimatedHours: 4,
        dueDate: new Date().toISOString(),
      } satisfies IErpHrmTimeTask.ICreate,
    },
  );
  typia.assert(task);
  const historyPage =
    await api.functional.erpHrmTime.member.projects.tasks.historyEntries.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          page: 1,
          limit: 10,
          sort: "-changedAt",
        } satisfies IErpHrmTimeTaskHistoryEntry.IRequest,
      },
    );
  typia.assert(historyPage);
  TestValidator.predicate(
    "task history entry should exist for the created task",
    historyPage.data.length > 0,
  );
  const historyEntry = historyPage.data[0];
  typia.assert(historyEntry);
  const fetched =
    await api.functional.erpHrmTime.member.projects.tasks.historyEntries.at(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        historyEntryId: historyEntry.id,
      },
    );
  typia.assert(fetched);
  TestValidator.equals("history entry id", fetched.id, historyEntry.id);
  TestValidator.equals("history task id", fetched.task.id, task.id);
  TestValidator.equals(
    "history project id",
    fetched.task.project.id,
    project.id,
  );
  TestValidator.equals(
    "history status change old status",
    fetched.oldStatus,
    historyEntry.oldStatus,
  );
  TestValidator.equals(
    "history status change new status",
    fetched.newStatus,
    historyEntry.newStatus,
  );
  TestValidator.equals(
    "history changed at",
    fetched.changedAt,
    historyEntry.changedAt,
  );
  const foreignConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(foreignConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password,
      name: RandomGenerator.name(),
      href: "https://example.com/erp-join",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  await TestValidator.error(
    "foreign organization must not access task history entry",
    async () => {
      await api.functional.erpHrmTime.member.projects.tasks.historyEntries.at(
        foreignConnection,
        {
          projectId: project.id,
          taskId: task.id,
          historyEntryId: historyEntry.id,
        },
      );
    },
  );
}
