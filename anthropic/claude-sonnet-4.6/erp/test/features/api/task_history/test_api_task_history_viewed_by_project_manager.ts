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
import type { IPageIErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTaskHistory";
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

export async function test_api_task_history_viewed_by_project_manager(
  connection: api.IConnection,
): Promise<void> {
  // ─── 1. Setup: Member Registration ───────────────────────────────────────
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // ─── 2. Create Organization (owner gets project:manage) ──────────────────
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // ─── 3. Create Project ───────────────────────────────────────────────────
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // ─── 4. Create Task (automatically generates initial history entry) ──────
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        status: "open",
      },
    },
  );
  typia.assert(task);
  // ─── 5. Primary Test: Retrieve Task Histories (no filters) ───────────────
  const historiesDefault =
    await api.functional.erpHrm.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {},
      },
    );
  typia.assert(historiesDefault);
  // Assert pagination defaults
  TestValidator.equals(
    "default pagination current page is 1",
    historiesDefault.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records at least 1",
    historiesDefault.pagination.records >= 1,
  );
  TestValidator.predicate(
    "data array has at least one entry",
    historiesDefault.data.length >= 1,
  );
  // Assert each history entry has required fields and correct taskId
  for (const entry of historiesDefault.data) {
    TestValidator.equals(
      "history entry taskId matches created task",
      entry.taskId,
      task.id,
    );
    TestValidator.predicate(
      "history entry has recorder",
      entry.recorder !== null && entry.recorder !== undefined,
    );
    TestValidator.predicate(
      "history entry has valid oldStatus",
      ["open", "in_progress", "completed", "closed"].includes(entry.oldStatus),
    );
    TestValidator.predicate(
      "history entry has valid newStatus",
      ["open", "in_progress", "completed", "closed"].includes(entry.newStatus),
    );
  }
  // ─── 6. Filtering: newStatus = 'open' ────────────────────────────────────
  const historiesFilteredByNewStatus =
    await api.functional.erpHrm.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: { newStatus: "open" },
      },
    );
  typia.assert(historiesFilteredByNewStatus);
  for (const entry of historiesFilteredByNewStatus.data) {
    TestValidator.equals(
      "filtered entry newStatus is open",
      entry.newStatus,
      "open",
    );
  }
  // ─── 7. Sorting: sortOrder = 'desc' ──────────────────────────────────────
  const historiesSortedDesc =
    await api.functional.erpHrm.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: { sortOrder: "desc" },
      },
    );
  typia.assert(historiesSortedDesc);
  // Verify descending order: each entry's createdAt >= next entry's createdAt
  for (let i = 0; i < historiesSortedDesc.data.length - 1; i++) {
    const current = historiesSortedDesc.data[i]!;
    const next = historiesSortedDesc.data[i + 1]!;
    TestValidator.predicate(
      "desc sorted entries are newest first",
      new Date(current.createdAt).getTime() >=
        new Date(next.createdAt).getTime(),
    );
  }
  // ─── 8. Pagination: page=1, limit=1 ──────────────────────────────────────
  const historiesPaginated =
    await api.functional.erpHrm.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
        },
      },
    );
  typia.assert(historiesPaginated);
  TestValidator.predicate(
    "paginated data length at most 1",
    historiesPaginated.data.length <= 1,
  );
  TestValidator.equals(
    "pagination limit is 1",
    historiesPaginated.pagination.limit,
    1,
  );
  // ─── 9. Date Range: createdAtFrom before task creation ───────────────────
  const beforeTaskCreation = new Date(
    new Date(task.createdAt).getTime() - 60000,
  ).toISOString();
  const historiesFromDate =
    await api.functional.erpHrm.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: { createdAtFrom: beforeTaskCreation },
      },
    );
  typia.assert(historiesFromDate);
  TestValidator.predicate(
    "createdAtFrom filter returns non-empty results",
    historiesFromDate.data.length >= 1,
  );
  // ─── 10. Edge Case: oldStatus = 'completed' (no matching entry) ──────────
  const historiesNoMatch =
    await api.functional.erpHrm.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: { oldStatus: "completed" },
      },
    );
  typia.assert(historiesNoMatch);
  TestValidator.equals(
    "no entries with oldStatus completed",
    historiesNoMatch.data.length,
    0,
  );
  TestValidator.equals(
    "records count is 0 for no matching entries",
    historiesNoMatch.pagination.records,
    0,
  );
  // ─── 11. Edge Case: createdAtFrom + createdAtTo encompassing task creation ─
  const afterTaskCreation = new Date(
    new Date(task.createdAt).getTime() + 60000,
  ).toISOString();
  const historiesDateRange =
    await api.functional.erpHrm.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          createdAtFrom: beforeTaskCreation,
          createdAtTo: afterTaskCreation,
        },
      },
    );
  typia.assert(historiesDateRange);
  TestValidator.predicate(
    "date range filter returns at least one record",
    historiesDateRange.data.length >= 1,
  );
}
