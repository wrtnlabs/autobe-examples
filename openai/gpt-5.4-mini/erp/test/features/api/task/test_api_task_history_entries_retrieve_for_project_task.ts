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

export async function test_api_task_history_entries_retrieve_for_project_task(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const project = await generate_random_erp_hrm_time_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#3366ff",
        status: "active",
        budgetHours: 100,
        startDate: new Date().toISOString(),
        endDate: null,
      },
    },
  );
  typia.assert(project);
  const task = await generate_random_erp_hrm_time_member_projects_tasks_create(
    memberConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        priority: "medium",
        estimatedHours: 8,
        dueDate: new Date().toISOString(),
      } satisfies IErpHrmTimeTask.ICreate,
    },
  );
  typia.assert(task);
  const response =
    await api.functional.erpHrmTime.member.projects.tasks.historyEntries.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          page: 1,
          limit: 20,
          sort: "-changedAt",
        } satisfies IErpHrmTimeTaskHistoryEntry.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.equals("requested page size", response.pagination.limit, 20);
  TestValidator.predicate(
    "non-negative records",
    response.pagination.records >= 0,
  );
  TestValidator.predicate("non-negative pages", response.pagination.pages >= 0);
  TestValidator.equals(
    "history task matches requested task",
    response.data.map((entry) => entry.task.id),
    response.data.map(() => task.id),
  );
  for (const entry of response.data) {
    TestValidator.equals("history entry task id", entry.task.id, task.id);
    TestValidator.predicate(
      "history entry has member summary",
      entry.member !== null,
    );
    TestValidator.predicate(
      "history entry old status present",
      entry.oldStatus.length > 0,
    );
    TestValidator.predicate(
      "history entry new status present",
      entry.newStatus.length > 0,
    );
    TestValidator.predicate(
      "history entry timestamp present",
      entry.changedAt.length > 0,
    );
  }
  for (let index = 1; index < response.data.length; index++) {
    TestValidator.predicate(
      "history ordered by most recent change first",
      response.data[index - 1].changedAt >= response.data[index].changedAt,
    );
  }
}
