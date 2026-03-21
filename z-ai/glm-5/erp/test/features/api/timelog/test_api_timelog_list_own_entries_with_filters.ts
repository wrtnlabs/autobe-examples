import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_timelog_list_own_entries_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // Step 2: Create multiple projects for testing
  const project1 = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: `Project Alpha ${RandomGenerator.alphabets(6)}`,
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(project1);
  const project2 = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: `Project Beta ${RandomGenerator.alphabets(6)}`,
        color_code: "#3357FF",
      },
    },
  );
  typia.assert(project2);
  const project3 = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: `Project Gamma ${RandomGenerator.alphabets(6)}`,
        color_code: "#33FF57",
      },
    },
  );
  typia.assert(project3);
  // Step 3: Create multiple timelogs with varying dates, projects, and billable status
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  // Create timelogs for different dates and projects
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project1.id,
        date: new Date(now.getTime() - oneDayMs * 1).toISOString(),
        duration: 120,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project1.id,
        date: new Date(now.getTime() - oneDayMs * 3).toISOString(),
        duration: 90,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: false,
      },
    },
  );
  typia.assert(timelog2);
  const timelog3 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project2.id,
        date: new Date(now.getTime() - oneDayMs * 5).toISOString(),
        duration: 180,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog3);
  const timelog4 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project2.id,
        date: new Date(now.getTime() - oneDayMs * 7).toISOString(),
        duration: 60,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog4);
  const timelog5 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project3.id,
        date: new Date(now.getTime() - oneDayMs * 10).toISOString(),
        duration: 240,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: false,
      },
    },
  );
  typia.assert(timelog5);
  // Step 4: Request timelog list without any filters
  const allTimelogs = await api.functional.erpHrm.member.timelogs.index(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(allTimelogs);
  // Validate employee sees only their own timelogs (employee.member.id should match)
  TestValidator.predicate(
    "all timelogs belong to authenticated member",
    allTimelogs.data.every((t) => t.employee.member.id === member.id),
  );
  // Validate created timelogs are in the result
  const createdIds = [
    timelog1.id,
    timelog2.id,
    timelog3.id,
    timelog4.id,
    timelog5.id,
  ];
  const allIds = allTimelogs.data.map((t) => t.id);
  TestValidator.predicate(
    "all created timelogs are present",
    createdIds.every((id) => allIds.includes(id)),
  );
  // Step 5: Apply date range filter
  const dateFrom = new Date(now.getTime() - oneDayMs * 6);
  const dateTo = new Date(now.getTime() - oneDayMs * 2);
  const dateFilteredTimelogs =
    await api.functional.erpHrm.member.timelogs.index(memberConnection, {
      body: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
      },
    });
  typia.assert(dateFilteredTimelogs);
  // Validate date range filtering
  TestValidator.predicate(
    "date filtered timelogs within range",
    dateFilteredTimelogs.data.every((t) => {
      const logDate = new Date(t.date);
      return logDate >= dateFrom && logDate <= dateTo;
    }),
  );
  // Expected: timelog1, timelog2, timelog3 should be in range (days 1, 3, 5 from now)
  const expectedDateFilteredIds = [timelog1.id, timelog2.id, timelog3.id];
  const dateFilteredIds = dateFilteredTimelogs.data.map((t) => t.id);
  TestValidator.predicate(
    "expected timelogs in date range",
    expectedDateFilteredIds.every((id) => dateFilteredIds.includes(id)),
  );
  // Step 6: Apply project filter
  const project1Timelogs = await api.functional.erpHrm.member.timelogs.index(
    memberConnection,
    {
      body: {
        projectId: project1.id,
      },
    },
  );
  typia.assert(project1Timelogs);
  // Validate project filtering
  TestValidator.predicate(
    "all timelogs belong to project1",
    project1Timelogs.data.every((t) => t.project.id === project1.id),
  );
  const project1Ids = project1Timelogs.data.map((t) => t.id);
  TestValidator.predicate(
    "project1 has timelog1 and timelog2",
    [timelog1.id, timelog2.id].every((id) => project1Ids.includes(id)),
  );
  // Step 7: Apply billable filter
  const billableTimelogs = await api.functional.erpHrm.member.timelogs.index(
    memberConnection,
    {
      body: {
        billable: true,
      },
    },
  );
  typia.assert(billableTimelogs);
  // Validate billable filtering
  TestValidator.predicate(
    "all timelogs are billable",
    billableTimelogs.data.every((t) => t.billable === true),
  );
  const nonBillableTimelogs = await api.functional.erpHrm.member.timelogs.index(
    memberConnection,
    {
      body: {
        billable: false,
      },
    },
  );
  typia.assert(nonBillableTimelogs);
  TestValidator.predicate(
    "all timelogs are non-billable",
    nonBillableTimelogs.data.every((t) => t.billable === false),
  );
  // Step 8: Test pagination
  const page1Timelogs = await api.functional.erpHrm.member.timelogs.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 2,
      },
    },
  );
  typia.assert(page1Timelogs);
  // Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    page1Timelogs.pagination.current,
    1,
  );
  TestValidator.equals("limit is 2", page1Timelogs.pagination.limit, 2);
  TestValidator.predicate(
    "records is positive",
    page1Timelogs.pagination.records > 0,
  );
  TestValidator.predicate(
    "data has at most 2 items",
    page1Timelogs.data.length <= 2,
  );
  if (page1Timelogs.pagination.pages > 1) {
    const page2Timelogs = await api.functional.erpHrm.member.timelogs.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 2,
        },
      },
    );
    typia.assert(page2Timelogs);
    TestValidator.equals(
      "current page is 2",
      page2Timelogs.pagination.current,
      2,
    );
    TestValidator.equals(
      "pagination consistent",
      page1Timelogs.pagination.records,
      page2Timelogs.pagination.records,
    );
    // Ensure pages don't overlap
    const page1Ids = page1Timelogs.data.map((t) => t.id);
    const page2Ids = page2Timelogs.data.map((t) => t.id);
    TestValidator.predicate(
      "pages have no overlap",
      page1Ids.every((id) => !page2Ids.includes(id)),
    );
  }
  // Step 9: Apply combination filters (date range + project + billable)
  const combinedFilteredTimelogs =
    await api.functional.erpHrm.member.timelogs.index(memberConnection, {
      body: {
        from: new Date(now.getTime() - oneDayMs * 6).toISOString(),
        to: new Date(now.getTime() - oneDayMs * 2).toISOString(),
        projectId: project1.id,
        billable: true,
      },
    });
  typia.assert(combinedFilteredTimelogs);
  // Validate combination filtering
  TestValidator.predicate(
    "all timelogs match combined criteria",
    combinedFilteredTimelogs.data.every((t) => {
      const logDate = new Date(t.date);
      const dateInRange = logDate >= dateFrom && logDate <= dateTo;
      const projectMatches = t.project.id === project1.id;
      const billableMatches = t.billable === true;
      return dateInRange && projectMatches && billableMatches;
    }),
  );
  // Expected: only timelog1 matches all criteria (project1, in date range, billable)
  const combinedIds = combinedFilteredTimelogs.data.map((t) => t.id);
  TestValidator.predicate(
    "timelog1 is in combined results",
    combinedIds.includes(timelog1.id),
  );
  TestValidator.predicate(
    "timelog2 is NOT in combined results (not billable)",
    !combinedIds.includes(timelog2.id),
  );
  // Validate timelog structure for each entry
  if (allTimelogs.data.length > 0) {
    const sampleTimelog = allTimelogs.data[0];
    TestValidator.predicate("timelog has id", sampleTimelog.id !== undefined);
    TestValidator.predicate(
      "timelog has employee",
      sampleTimelog.employee !== undefined,
    );
    TestValidator.predicate(
      "timelog has project",
      sampleTimelog.project !== undefined,
    );
    TestValidator.predicate(
      "timelog has date",
      sampleTimelog.date !== undefined,
    );
    TestValidator.predicate(
      "timelog has duration",
      sampleTimelog.duration !== undefined,
    );
    TestValidator.predicate(
      "timelog has billable flag",
      typeof sampleTimelog.billable === "boolean",
    );
    TestValidator.predicate(
      "timelog has createdAt",
      sampleTimelog.createdAt !== undefined,
    );
  }
}
