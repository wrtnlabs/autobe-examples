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

export async function test_api_task_history_entries_pagination_and_immutability(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234Abcd!",
      name: RandomGenerator.name(),
      href: "https://example.com/registration",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const project = await generate_random_erp_hrm_time_member_projects_create(
    memberConnection,
    {
      body: {
        name: `Task history ${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#3366ff",
        status: "active",
        budgetHours: 100,
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
        title: `History task ${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        priority: "medium",
        estimatedHours: 8,
        dueDate: null,
      } satisfies IErpHrmTimeTask.ICreate,
    },
  );
  typia.assert(task);
  const pageOne =
    await api.functional.erpHrmTime.member.projects.tasks.historyEntries.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          page: 1,
          limit: 1,
          sort: "-changedAt",
        } satisfies IErpHrmTimeTaskHistoryEntry.IRequest,
      },
    );
  typia.assert(pageOne);
  const pageOneAgain =
    await api.functional.erpHrmTime.member.projects.tasks.historyEntries.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          page: 1,
          limit: 1,
          sort: "-changedAt",
        } satisfies IErpHrmTimeTaskHistoryEntry.IRequest,
      },
    );
  typia.assert(pageOneAgain);
  TestValidator.equals("page 1 is stable", pageOneAgain, pageOne);
  TestValidator.equals("page 1 current", pageOne.pagination.current, 1);
  TestValidator.equals("page 1 limit", pageOne.pagination.limit, 1);
  TestValidator.equals(
    "page 1 size matches pagination",
    pageOne.data.length,
    Math.min(pageOne.pagination.limit, pageOne.pagination.records),
  );
  if (pageOne.data.length > 0) {
    const firstEntry = pageOne.data[0];
    TestValidator.equals(
      "history entry belongs to task",
      firstEntry.task.id,
      task.id,
    );
    TestValidator.predicate(
      "history entry records a valid transition",
      firstEntry.oldStatus !== firstEntry.newStatus,
    );
    TestValidator.predicate(
      "history entry actor is present",
      firstEntry.member !== null && firstEntry.member !== undefined,
    );
    TestValidator.predicate(
      "history entry timestamp is present",
      firstEntry.changedAt.length > 0,
    );
  }
  if (pageOne.pagination.pages > 1) {
    const pageTwo =
      await api.functional.erpHrmTime.member.projects.tasks.historyEntries.index(
        memberConnection,
        {
          projectId: project.id,
          taskId: task.id,
          body: {
            page: 2,
            limit: 1,
            sort: "-changedAt",
          } satisfies IErpHrmTimeTaskHistoryEntry.IRequest,
        },
      );
    typia.assert(pageTwo);
    TestValidator.equals("page 2 current", pageTwo.pagination.current, 2);
    TestValidator.equals("page 2 limit", pageTwo.pagination.limit, 1);
    TestValidator.notEquals(
      "adjacent pages should not repeat the same first history row",
      pageOne.data[0]?.id,
      pageTwo.data[0]?.id,
    );
  }
}
