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
import { prepare_random_erp_hrm_time_project } from "../../../prepare/prepare_random_erp_hrm_time_project";

export async function test_api_task_history_project_browse(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const projectConnection: api.IConnection = { host: connection.host };
  projectConnection.headers = {
    Authorization: member.token.access,
  };
  const project = await generate_random_erp_hrm_time_member_projects_create(
    projectConnection,
    {
      body: {
        name: `Task History Project ${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#3366ff",
        status: "active",
        budgetHours: 100,
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        endDate: null,
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(project);
  const page1 =
    await api.functional.erpHrmTime.member.projects.taskHistories.index(
      projectConnection,
      {
        projectId: project.id,
        body: {
          page: 1,
          limit: 10,
          sort: "-changedAt",
        } satisfies IErpHrmTimeTaskHistoryEntry.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "task history pagination exists",
    page1.pagination !== null && page1.pagination !== undefined,
  );
  TestValidator.predicate(
    "task history data exists as an array",
    Array.isArray(page1.data),
  );
  TestValidator.predicate(
    "task history entries are scoped to the requested project",
    page1.data.every((entry) => entry.task.project.id === project.id),
  );
  TestValidator.predicate(
    "task history entries are ordered newest first when present",
    (() => {
      for (let i = 1; i < page1.data.length; i++) {
        if (page1.data[i - 1].changedAt < page1.data[i].changedAt) return false;
      }
      return true;
    })(),
  );
  const page2 =
    await api.functional.erpHrmTime.member.projects.taskHistories.index(
      projectConnection,
      {
        projectId: project.id,
        body: {
          page: 2,
          limit: 10,
          sort: "-changedAt",
        } satisfies IErpHrmTimeTaskHistoryEntry.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals(
    "task history pagination limit matches request",
    page2.pagination.limit,
    10,
  );
  TestValidator.equals(
    "task history requested page is returned",
    page2.pagination.current,
    2,
  );
  TestValidator.predicate(
    "later page entries remain scoped to the requested project",
    page2.data.every((entry) => entry.task.project.id === project.id),
  );
  TestValidator.predicate(
    "later page entries are ordered newest first when present",
    (() => {
      for (let i = 1; i < page2.data.length; i++) {
        if (page2.data[i - 1].changedAt < page2.data[i].changedAt) return false;
      }
      return true;
    })(),
  );
}
