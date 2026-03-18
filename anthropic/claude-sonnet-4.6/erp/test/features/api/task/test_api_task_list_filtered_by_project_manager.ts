import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

export async function test_api_task_list_filtered_by_project_manager(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member (becomes Owner of any org they create)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a new organization — member becomes Owner with project:manage
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Switch to the new organization context
  const orgMember =
    await api.functional.erpHrm.member.organizations._switch.switchContext(
      memberConnection,
      { organizationId: organization.id },
    );
  typia.assert(orgMember);
  // 4. Create a new project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 5. Create 3 tasks with distinct statuses and priorities
  const task1 = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: { status: "open", priority: "high", title: "Task Open High" },
    },
  );
  typia.assert(task1);
  const task2 = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        status: "in-progress",
        priority: "urgent",
        title: "Task InProgress Urgent",
      },
    },
  );
  typia.assert(task2);
  const task3 = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        status: "completed",
        priority: "low",
        title: "Task Completed Low",
      },
    },
  );
  typia.assert(task3);
  // Primary Success Scenario 1: No filter — all tasks returned
  const allTasksPage = await api.functional.erpHrm.member.projects.tasks.index(
    memberConnection,
    {
      projectId: project.id,
      body: {},
    },
  );
  typia.assert(allTasksPage);
  TestValidator.predicate(
    "all tasks records >= 3",
    allTasksPage.pagination.records >= 3,
  );
  TestValidator.predicate(
    "all tasks pages >= 1",
    allTasksPage.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "all tasks current page is 1",
    allTasksPage.pagination.current === 1,
  );
  // Primary Success Scenario 2: Filter by statuses=['open']
  const openTasksPage = await api.functional.erpHrm.member.projects.tasks.index(
    memberConnection,
    {
      projectId: project.id,
      body: { statuses: ["open"] },
    },
  );
  typia.assert(openTasksPage);
  TestValidator.predicate(
    "all open tasks have status open",
    openTasksPage.data.every((t) => t.status === "open"),
  );
  // Primary Success Scenario 3: Filter by priorities=['urgent', 'high']
  const urgentHighTasksPage =
    await api.functional.erpHrm.member.projects.tasks.index(memberConnection, {
      projectId: project.id,
      body: { priorities: ["urgent", "high"] },
    });
  typia.assert(urgentHighTasksPage);
  TestValidator.predicate(
    "all tasks have urgent or high priority",
    urgentHighTasksPage.data.every(
      (t) => t.priority === "urgent" || t.priority === "high",
    ),
  );
  // Primary Success Scenario 4: Filter statuses=['in-progress'] with sortBy and sortOrder
  const inProgressSortedPage =
    await api.functional.erpHrm.member.projects.tasks.index(memberConnection, {
      projectId: project.id,
      body: {
        statuses: ["in-progress"],
        sortBy: "priority",
        sortOrder: "desc",
      },
    });
  typia.assert(inProgressSortedPage);
  TestValidator.predicate(
    "all in-progress tasks have status in-progress",
    inProgressSortedPage.data.every((t) => t.status === "in-progress"),
  );
  // Primary Success Scenario 5: Pagination with page=1, limit=1
  const paginatedPage = await api.functional.erpHrm.member.projects.tasks.index(
    memberConnection,
    {
      projectId: project.id,
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 1 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      },
    },
  );
  typia.assert(paginatedPage);
  TestValidator.predicate(
    "paginated limit is 1",
    paginatedPage.pagination.limit === 1,
  );
  TestValidator.predicate(
    "paginated current page is 1",
    paginatedPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "paginated data has exactly 1 task",
    paginatedPage.data.length === 1,
  );
  TestValidator.predicate(
    "paginated total records >= 3",
    paginatedPage.pagination.records >= 3,
  );
  TestValidator.predicate(
    "paginated total pages >= 3",
    paginatedPage.pagination.pages >= 3,
  );
}
