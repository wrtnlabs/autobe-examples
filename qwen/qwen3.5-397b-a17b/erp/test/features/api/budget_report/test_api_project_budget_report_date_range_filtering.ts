import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectBudgetReport";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProjectBudgetReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test date range filtering functionality for project budget reports.
 *
 * This test validates that the budget report endpoint correctly filters
 * timelogs based on date_from and date_to parameters:
 *
 * 1. Authenticate as a member to access organization reports
 * 2. Create multiple projects with budget hours for testing
 * 3. Create timelogs with different work dates spanning multiple weeks
 * 4. Request budget report with specific date range parameters
 * 5. Verify actual hours are calculated only from timelogs within the date range
 * 6. Test with non-overlapping date ranges to confirm zero actual hours
 * 7. Validate utilization percentage recalculates based on filtered hours
 * 8. Confirm projects with budget but no timelogs in range show zero utilization
 */
export async function test_api_project_budget_report_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create projects with budget hours
  const project1 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#FF5733",
        status: "active",
        budget_hours: 100,
      },
    },
  );
  typia.assert(project1);
  const project2 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#33FF57",
        status: "active",
        budget_hours: 80,
      },
    },
  );
  typia.assert(project2);
  // 3. Create timelogs with different dates
  // Timelog in week 1 (within first date range)
  const timelog1 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: "2024-01-15T00:00:00.000Z",
        durationMinutes: 120,
        projectId: project1.id,
      },
    },
  );
  typia.assert(timelog1);
  // Timelog in week 2 (within second date range)
  const timelog2 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: "2024-01-22T00:00:00.000Z",
        durationMinutes: 180,
        projectId: project1.id,
      },
    },
  );
  typia.assert(timelog2);
  // Timelog for project2 in week 1
  const timelog3 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: "2024-01-16T00:00:00.000Z",
        durationMinutes: 60,
        projectId: project2.id,
      },
    },
  );
  typia.assert(timelog3);
  // 4. Test budget report with date range covering week 1 only
  const reportWeek1 =
    await api.functional.hrmPlatform.member.reports.budget.index(
      memberConnection,
      {
        body: {
          date_from: "2024-01-14",
          date_to: "2024-01-20",
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(reportWeek1);
  // 5. Verify actual hours are filtered correctly for week 1
  const project1InWeek1 = reportWeek1.data.find((r) => r.id === project1.id);
  TestValidator.predicate(
    "project1 exists in week 1 report",
    project1InWeek1 !== undefined,
  );
  if (project1InWeek1) {
    TestValidator.equals(
      "project1 actual hours in week 1",
      project1InWeek1.actual_hours,
      2,
    );
    TestValidator.predicate(
      "project1 utilization in week 1",
      project1InWeek1.utilization_percentage === 2,
    );
  }
  const project2InWeek1 = reportWeek1.data.find((r) => r.id === project2.id);
  TestValidator.predicate(
    "project2 exists in week 1 report",
    project2InWeek1 !== undefined,
  );
  if (project2InWeek1) {
    TestValidator.equals(
      "project2 actual hours in week 1",
      project2InWeek1.actual_hours,
      1,
    );
  }
  // 6. Test budget report with date range covering week 2 only
  const reportWeek2 =
    await api.functional.hrmPlatform.member.reports.budget.index(
      memberConnection,
      {
        body: {
          date_from: "2024-01-21",
          date_to: "2024-01-27",
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(reportWeek2);
  // 7. Verify project1 has timelog from week 2, project2 has zero hours
  const project1InWeek2 = reportWeek2.data.find((r) => r.id === project1.id);
  TestValidator.predicate(
    "project1 exists in week 2 report",
    project1InWeek2 !== undefined,
  );
  if (project1InWeek2) {
    TestValidator.equals(
      "project1 actual hours in week 2",
      project1InWeek2.actual_hours,
      3,
    );
  }
  const project2InWeek2 = reportWeek2.data.find((r) => r.id === project2.id);
  TestValidator.predicate(
    "project2 exists in week 2 report",
    project2InWeek2 !== undefined,
  );
  if (project2InWeek2) {
    TestValidator.equals(
      "project2 actual hours in week 2",
      project2InWeek2.actual_hours,
      0,
    );
    TestValidator.equals(
      "project2 utilization in week 2",
      project2InWeek2.utilization_percentage,
      0,
    );
  }
  // 8. Test with non-overlapping date range (no timelogs)
  const reportNoData =
    await api.functional.hrmPlatform.member.reports.budget.index(
      memberConnection,
      {
        body: {
          date_from: "2024-02-01",
          date_to: "2024-02-07",
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(reportNoData);
  // All projects should show zero actual hours in this range
  for (const report of reportNoData.data) {
    TestValidator.equals(
      `project ${report.name} has zero hours in no-data range`,
      report.actual_hours,
      0,
    );
    TestValidator.equals(
      `project ${report.name} has zero utilization in no-data range`,
      report.utilization_percentage,
      0,
    );
  }
  // 9. Test with full date range covering all timelogs
  const reportFull =
    await api.functional.hrmPlatform.member.reports.budget.index(
      memberConnection,
      {
        body: {
          date_from: "2024-01-14",
          date_to: "2024-01-27",
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(reportFull);
  const project1Full = reportFull.data.find((r) => r.id === project1.id);
  if (project1Full) {
    TestValidator.equals(
      "project1 total actual hours",
      project1Full.actual_hours,
      5,
    );
    TestValidator.equals(
      "project1 total utilization",
      project1Full.utilization_percentage,
      5,
    );
  }
  const project2Full = reportFull.data.find((r) => r.id === project2.id);
  if (project2Full) {
    TestValidator.equals(
      "project2 total actual hours",
      project2Full.actual_hours,
      1,
    );
    TestValidator.equals(
      "project2 total utilization",
      project2Full.utilization_percentage,
      1.25,
    );
  }
}
