import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
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
import { prepare_random_erp_hrm_time_task_history_entry } from "../../../prepare/prepare_random_erp_hrm_time_task_history_entry";

export async function test_api_project_tasks_employee_filter_and_empty_result(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!Abcd" as string & tags.Format<"password">,
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/referrer",
      avatarImageUrl: null,
      phoneNumber: null,
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const project = await generate_random_erp_hrm_time_member_projects_create(
    memberConnection,
    {
      body: {
        name: `project-${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#3366ff",
        status: "active",
        budgetHours: null,
        startDate: null,
        endDate: null,
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(project);
  const topLevelTask =
    await generate_random_erp_hrm_time_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: `top-${RandomGenerator.alphabets(8)}`,
          description: null,
          status: "open",
          priority: "low",
          estimatedHours: null,
          dueDate: null,
          employeeId: null,
          parentTaskId: null,
        } satisfies IErpHrmTimeTaskHistoryEntry.ICreate,
      },
    );
  typia.assert(topLevelTask);
  const secondTopLevelTask =
    await generate_random_erp_hrm_time_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: `top-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          status: "open",
          priority: "medium",
          estimatedHours: 3,
          dueDate: null,
          employeeId: null,
          parentTaskId: null,
        } satisfies IErpHrmTimeTaskHistoryEntry.ICreate,
      },
    );
  typia.assert(secondTopLevelTask);
  const page = await api.functional.erpHrmTime.member.projects.tasks.index(
    memberConnection,
    {
      projectId: project.id,
      body: {
        page: 1,
        pageSize: 50,
        status: undefined,
        priority: undefined,
        employeeId: undefined,
        sort: "createdAt",
        order: "asc",
        limit: 50,
      } satisfies IErpHrmTimeTaskHistoryEntry.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.equals("page current", page.pagination.current, 1);
  TestValidator.equals("page limit", page.pagination.limit, 50);
  TestValidator.equals(
    "page records",
    page.pagination.records,
    page.data.length,
  );
  TestValidator.equals("page pages", page.pagination.pages, 1);
  TestValidator.equals("returned count", page.data.length, 2);
  TestValidator.equals(
    "first task project",
    page.data[0]?.project.id,
    project.id,
  );
  TestValidator.equals(
    "second task project",
    page.data[1]?.project.id,
    project.id,
  );
  TestValidator.equals("first task parent", page.data[0]?.parentTask, null);
  TestValidator.equals("second task parent", page.data[1]?.parentTask, null);
  const emptyPage = await api.functional.erpHrmTime.member.projects.tasks.index(
    memberConnection,
    {
      projectId: project.id,
      body: {
        page: 1,
        pageSize: 10,
        employeeId: typia.random<string & tags.Format<"uuid">>(),
        status: undefined,
        priority: undefined,
        sort: "createdAt",
        order: "asc",
        limit: 10,
      } satisfies IErpHrmTimeTaskHistoryEntry.IRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals("empty data length", emptyPage.data.length, 0);
  TestValidator.equals("empty current page", emptyPage.pagination.current, 1);
  TestValidator.equals("empty page limit", emptyPage.pagination.limit, 10);
  TestValidator.equals("empty records", emptyPage.pagination.records, 0);
  TestValidator.equals("empty pages", emptyPage.pagination.pages, 0);
  const oversizedPage =
    await api.functional.erpHrmTime.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          page: 1,
          pageSize: 100,
          status: undefined,
          priority: undefined,
          employeeId: undefined,
          sort: "createdAt",
          order: "asc",
          limit: 100,
        } satisfies IErpHrmTimeTaskHistoryEntry.IRequest,
      },
    );
  typia.assert(oversizedPage);
  TestValidator.equals("oversized data length", oversizedPage.data.length, 2);
  TestValidator.equals(
    "oversized records",
    oversizedPage.pagination.records,
    2,
  );
  TestValidator.equals("oversized pages", oversizedPage.pagination.pages, 1);
  TestValidator.equals(
    "oversized current",
    oversizedPage.pagination.current,
    1,
  );
  TestValidator.equals("oversized limit", oversizedPage.pagination.limit, 100);
  TestValidator.equals(
    "oversized first project",
    oversizedPage.data[0]?.project.id,
    project.id,
  );
  TestValidator.equals(
    "oversized second project",
    oversizedPage.data[1]?.project.id,
    project.id,
  );
}
