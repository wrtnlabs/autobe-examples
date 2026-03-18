import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IHrmPlatformWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformWeeklySummaryReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformWeeklySummaryReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test the weekly summary report with project-specific filtering.
 * 1. Authenticate as member with report:view permission
 * 2. Create organization context
 * 3. Create multiple employees with different member accounts
 * 4. Create multiple projects for filtering test
 * 5. Assign employees to different projects as project members
 * 6. Create timelogs for different projects in the same week period
 * 7. Query weekly summary with project_code filter
 * 8. Verify response only includes timelogs from filtered project
 * 9. Validate totalHours, timelogCount, employeeCount reflect filtered data
 * 10. Test pagination with project filtering
 */
export async function test_api_weekly_summary_report_project_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member with report:view permission
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create organization context
  const orgConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      orgConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create additional member accounts for employees
  const employee1MemberConnection: api.IConnection = { host: connection.host };
  const employee1MemberAuth = await authorize_member_join(
    employee1MemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPass123!",
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(employee1MemberAuth);
  const employee2MemberConnection: api.IConnection = { host: connection.host };
  const employee2MemberAuth = await authorize_member_join(
    employee2MemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPass123!",
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(employee2MemberAuth);
  // 4. Create employees using the member accounts
  const employee1 = await generate_random_hrm_platform_member_employees_create(
    orgConnection,
    {
      body: {
        member_id: employee1MemberAuth.id,
        employment_type: "full-time",
        status: "active",
      },
    },
  );
  typia.assert(employee1);
  const employee2 = await generate_random_hrm_platform_member_employees_create(
    orgConnection,
    {
      body: {
        member_id: employee2MemberAuth.id,
        employment_type: "part-time",
        status: "active",
      },
    },
  );
  typia.assert(employee2);
  // 5. Create multiple projects for filtering test
  const projectA = await generate_random_hrm_platform_member_projects_create(
    orgConnection,
    {
      body: {
        name: "Project Alpha",
        color_code: "#FF0000",
        status: "active",
      },
    },
  );
  typia.assert(projectA);
  const projectB = await generate_random_hrm_platform_member_projects_create(
    orgConnection,
    {
      body: {
        name: "Project Beta",
        color_code: "#00FF00",
        status: "active",
      },
    },
  );
  typia.assert(projectB);
  // 6. Assign employees to different projects
  // Employee 1 -> Project A
  await generate_random_hrm_platform_member_projects_members_create(
    orgConnection,
    {
      params: { projectId: projectA.id },
      body: {
        hrm_platform_employee_id: employee1.id,
        role: "member",
      },
    },
  );
  // Employee 2 -> Project B
  await generate_random_hrm_platform_member_projects_members_create(
    orgConnection,
    {
      params: { projectId: projectB.id },
      body: {
        hrm_platform_employee_id: employee2.id,
        role: "member",
      },
    },
  );
  // Employee 1 -> Project B (so employee 1 has timelogs in both projects)
  await generate_random_hrm_platform_member_projects_members_create(
    orgConnection,
    {
      params: { projectId: projectB.id },
      body: {
        hrm_platform_employee_id: employee1.id,
        role: "member",
      },
    },
  );
  // 7. Create timelogs for different projects in the same week period
  const testDate = new Date();
  testDate.setHours(10, 0, 0, 0);
  const testDateISO = testDate.toISOString();
  // Timelog for Employee 1 on Project A (2 hours = 120 minutes)
  const timelog1 = await generate_random_hrm_platform_member_timelogs_create(
    orgConnection,
    {
      body: {
        project_id: projectA.id,
        date: testDateISO,
        duration_minutes: 120,
        description: "Work on Project Alpha",
        billable: true,
      },
    },
  );
  typia.assert(timelog1);
  // Timelog for Employee 1 on Project A (1 hour = 60 minutes)
  const timelog2 = await generate_random_hrm_platform_member_timelogs_create(
    orgConnection,
    {
      body: {
        project_id: projectA.id,
        date: testDateISO,
        duration_minutes: 60,
        description: "More work on Project Alpha",
        billable: true,
      },
    },
  );
  typia.assert(timelog2);
  // Timelog for Employee 2 on Project B (3 hours = 180 minutes)
  const timelog3 = await generate_random_hrm_platform_member_timelogs_create(
    orgConnection,
    {
      body: {
        project_id: projectB.id,
        date: testDateISO,
        duration_minutes: 180,
        description: "Work on Project Beta",
        billable: true,
      },
    },
  );
  typia.assert(timelog3);
  // Timelog for Employee 1 on Project B (1.5 hours = 90 minutes)
  const timelog4 = await generate_random_hrm_platform_member_timelogs_create(
    orgConnection,
    {
      body: {
        project_id: projectB.id,
        date: testDateISO,
        duration_minutes: 90,
        description: "Work on Project Beta by Employee 1",
        billable: false,
      },
    },
  );
  typia.assert(timelog4);
  // 8. Query weekly summary with project_code filter for Project A
  const weeklySummaryProjectA =
    await api.functional.hrmPlatform.member.reports.weekly_summary.search(
      orgConnection,
      {
        body: {
          project_code: projectA.id,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(weeklySummaryProjectA);
  // 9. Verify pagination structure
  TestValidator.predicate(
    "pagination exists",
    weeklySummaryProjectA.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(weeklySummaryProjectA.data),
  );
  TestValidator.predicate(
    "has at least one week",
    weeklySummaryProjectA.data.length >= 1,
  );
  // 10. Find the week containing our test date
  const testWeek = weeklySummaryProjectA.data.find((week) => {
    const weekStart = new Date(week.weekStart);
    const weekEnd = new Date(week.weekEnd);
    const testDateTime = new Date(testDateISO);
    return testDateTime >= weekStart && testDateTime <= weekEnd;
  });
  TestValidator.predicate("test week found in results", testWeek !== undefined);
  if (testWeek) {
    // 11. Validate Project A metrics (should only include timelogs 1 and 2)
    // Total: 120 + 60 = 180 minutes = 3 hours
    TestValidator.equals(
      "Project A total hours should be 3 (120+60 minutes)",
      testWeek.totalHours,
      3,
    );
    // Timelog count: 2 (timelog1 and timelog2)
    TestValidator.equals(
      "Project A timelog count should be 2",
      testWeek.timelogCount,
      2,
    );
    // Employee count: 1 (only employee1 logged time on Project A)
    TestValidator.equals(
      "Project A employee count should be 1",
      testWeek.employeeCount,
      1,
    );
  }
  // 12. Query weekly summary with project_code filter for Project B
  const weeklySummaryProjectB =
    await api.functional.hrmPlatform.member.reports.weekly_summary.search(
      orgConnection,
      {
        body: {
          project_code: projectB.id,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(weeklySummaryProjectB);
  // 13. Find the week for Project B
  const testWeekB = weeklySummaryProjectB.data.find((week) => {
    const weekStart = new Date(week.weekStart);
    const weekEnd = new Date(week.weekEnd);
    const testDateTime = new Date(testDateISO);
    return testDateTime >= weekStart && testDateTime <= weekEnd;
  });
  TestValidator.predicate(
    "test week found in Project B results",
    testWeekB !== undefined,
  );
  if (testWeekB) {
    // 14. Validate Project B metrics (should include timelogs 3 and 4)
    // Total: 180 + 90 = 270 minutes = 4.5 hours
    TestValidator.equals(
      "Project B total hours should be 4.5 (180+90 minutes)",
      testWeekB.totalHours,
      4.5,
    );
    // Timelog count: 2 (timelog3 and timelog4)
    TestValidator.equals(
      "Project B timelog count should be 2",
      testWeekB.timelogCount,
      2,
    );
    // Employee count: 2 (both employee1 and employee2 logged time on Project B)
    TestValidator.equals(
      "Project B employee count should be 2",
      testWeekB.employeeCount,
      2,
    );
  }
  // 15. Query weekly summary without project filter (all projects)
  const weeklySummaryAll =
    await api.functional.hrmPlatform.member.reports.weekly_summary.search(
      orgConnection,
      {
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(weeklySummaryAll);
  // 16. Find the week in unfiltered results
  const testWeekAll = weeklySummaryAll.data.find((week) => {
    const weekStart = new Date(week.weekStart);
    const weekEnd = new Date(week.weekEnd);
    const testDateTime = new Date(testDateISO);
    return testDateTime >= weekStart && testDateTime <= weekEnd;
  });
  TestValidator.predicate(
    "test week found in unfiltered results",
    testWeekAll !== undefined,
  );
  if (testWeekAll) {
    // 17. Validate unfiltered metrics (should include all 4 timelogs)
    // Total: 120 + 60 + 180 + 90 = 450 minutes = 7.5 hours
    TestValidator.equals(
      "All projects total hours should be 7.5 (450 minutes)",
      testWeekAll.totalHours,
      7.5,
    );
    // Timelog count: 4 (all timelogs)
    TestValidator.equals(
      "All projects timelog count should be 4",
      testWeekAll.timelogCount,
      4,
    );
    // Employee count: 2 (both employees logged time across all projects)
    TestValidator.equals(
      "All projects employee count should be 2",
      testWeekAll.employeeCount,
      2,
    );
  }
  // 18. Verify project filtering isolates data correctly
  if (testWeek && testWeekB && testWeekAll) {
    // Project A + Project B hours should equal all projects hours
    TestValidator.equals(
      "Filtered project hours should sum to total",
      testWeek.totalHours + testWeekB.totalHours,
      testWeekAll.totalHours,
    );
    // Project A + Project B timelog counts should equal total
    TestValidator.equals(
      "Filtered project timelog counts should sum to total",
      testWeek.timelogCount + testWeekB.timelogCount,
      testWeekAll.timelogCount,
    );
  }
  // 19. Test pagination with project filter
  const weeklySummaryPaginated =
    await api.functional.hrmPlatform.member.reports.weekly_summary.search(
      orgConnection,
      {
        body: {
          project_code: projectA.id,
          page: 1,
          limit: 1,
        },
      },
    );
  typia.assert(weeklySummaryPaginated);
  TestValidator.equals(
    "Pagination limit should be respected",
    weeklySummaryPaginated.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "Pagination current page should be 1",
    weeklySummaryPaginated.pagination.current >= 1,
  );
}
