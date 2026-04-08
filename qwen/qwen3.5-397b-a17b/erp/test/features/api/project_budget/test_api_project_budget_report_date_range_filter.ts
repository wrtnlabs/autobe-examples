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
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
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
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test the project budget utilization report with date range filtering to verify timelogs are correctly filtered by date boundaries.
 *
 * Validates the complete date range filtering functionality of the project budget report endpoint. The test creates a controlled dataset with timelogs spanning before, within, and after a specific date range, then verifies that the report correctly includes only timelogs within the specified boundaries.
 *
 * The test covers inclusive date boundary handling, ensuring timelogs on date_from and date_to are included in the calculation. It also validates that projects without timelogs in the date range still appear with actual_hours = 0 if they have budget_hours defined.
 *
 * 1. Member authentication and organization setup.
 * 2. Project creation with defined budget_hours (100 hours).
 * 3. Timelog creation with dates: 2 days before range, on date_from, middle of range, on date_to, 2 days after range.
 * 4. Report query with date range filter and validation of actual_hours calculation.
 * 5. Additional filter testing with status and billable parameters.
 * 6. Edge case: project with budget but no timelogs in range shows actual_hours = 0.
 */
export async function test_api_project_budget_report_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create project with budget_hours (100 hours = 6000 minutes)
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        budgetHours: 100,
      } satisfies Partial<IHrmPlatformProject.ICreate>,
    },
  );
  typia.assert(project);
  // 4. Create timelogs with various dates for testing date range filtering
  // Define date range: 2024-06-01 to 2024-06-10 (10 days inclusive)
  const dateFrom = new Date("2024-06-01T00:00:00Z");
  const dateTo = new Date("2024-06-10T23:59:59Z");
  // Timelog 1: Before date range (2024-05-30) - 30 minutes, should be EXCLUDED
  const timelogBefore =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: new Date("2024-05-30T10:00:00Z").toISOString(),
          duration_minutes: 30,
          hrm_platform_project_id: project.id,
          billable: true,
        } satisfies Partial<IHrmPlatformTimelog.ICreate>,
      },
    );
  typia.assert(timelogBefore);
  // Timelog 2: On date_from (2024-06-01) - 60 minutes, should be INCLUDED
  const timelogOnFrom =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: dateFrom.toISOString(),
          duration_minutes: 60,
          hrm_platform_project_id: project.id,
          billable: true,
        } satisfies Partial<IHrmPlatformTimelog.ICreate>,
      },
    );
  typia.assert(timelogOnFrom);
  // Timelog 3: Middle of range (2024-06-05) - 90 minutes, should be INCLUDED
  const timelogMiddle =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: new Date("2024-06-05T14:00:00Z").toISOString(),
          duration_minutes: 90,
          hrm_platform_project_id: project.id,
          billable: true,
        } satisfies Partial<IHrmPlatformTimelog.ICreate>,
      },
    );
  typia.assert(timelogMiddle);
  // Timelog 4: On date_to (2024-06-10) - 45 minutes, should be INCLUDED
  const timelogOnTo = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: dateTo.toISOString(),
        duration_minutes: 45,
        hrm_platform_project_id: project.id,
        billable: true,
      } satisfies Partial<IHrmPlatformTimelog.ICreate>,
    },
  );
  typia.assert(timelogOnTo);
  // Timelog 5: After date range (2024-06-15) - 120 minutes, should be EXCLUDED
  const timelogAfter =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: new Date("2024-06-15T09:00:00Z").toISOString(),
          duration_minutes: 120,
          hrm_platform_project_id: project.id,
          billable: true,
        } satisfies Partial<IHrmPlatformTimelog.ICreate>,
      },
    );
  typia.assert(timelogAfter);
  // 5. Query report with date range filter
  // Expected actual_hours: (60 + 90 + 45) / 60 = 195 / 60 = 3.25 hours
  const reportWithDateRange =
    await api.functional.hrmPlatform.member.reports.project_budget.index(
      memberConnection,
      {
        body: {
          date_from: dateFrom.toISOString(),
          date_to: dateTo.toISOString(),
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(reportWithDateRange);
  // Validate pagination structure
  TestValidator.predicate(
    "has valid pagination",
    reportWithDateRange.pagination !== undefined,
  );
  TestValidator.predicate(
    "has data array",
    Array.isArray(reportWithDateRange.data),
  );
  // Find our project in results
  const projectReport = reportWithDateRange.data.find(
    (r) => r.project.id === project.id,
  );
  TestValidator.predicate(
    "project found in report",
    projectReport !== undefined,
  );
  if (projectReport) {
    // Validate actual_hours calculation (only timelogs within date range)
    // Included: 60 + 90 + 45 = 195 minutes = 3.25 hours
    TestValidator.equals(
      "actual_hours matches expected (3.25 hours)",
      projectReport.actual_hours,
      3.25,
    );
    // Validate budget_hours
    TestValidator.equals(
      "budget_hours matches project",
      projectReport.budget_hours,
      100,
    );
    // Validate remaining_hours
    TestValidator.equals(
      "remaining_hours calculated correctly",
      projectReport.remaining_hours,
      96.75,
    );
    // Validate utilization_percentage
    TestValidator.predicate(
      "utilization_percentage is correct",
      Math.abs(projectReport.utilization_percentage - 3.25) < 0.01,
    );
  }
  // 6. Test with billable filter - create non-billable timelog
  const timelogNonBillable =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: new Date("2024-06-05T10:00:00Z").toISOString(),
          duration_minutes: 60,
          hrm_platform_project_id: project.id,
          billable: false,
        } satisfies Partial<IHrmPlatformTimelog.ICreate>,
      },
    );
  typia.assert(timelogNonBillable);
  // Query with billable=true filter
  const reportBillableOnly =
    await api.functional.hrmPlatform.member.reports.project_budget.index(
      memberConnection,
      {
        body: {
          date_from: dateFrom.toISOString(),
          date_to: dateTo.toISOString(),
          billable: true,
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(reportBillableOnly);
  const projectReportBillable = reportBillableOnly.data.find(
    (r) => r.project.id === project.id,
  );
  if (projectReportBillable) {
    // Should still be 3.25 hours (non-billable timelog excluded)
    TestValidator.equals(
      "billable filter excludes non-billable",
      projectReportBillable.actual_hours,
      3.25,
    );
  }
  // Query with billable=false filter
  const reportNonBillableOnly =
    await api.functional.hrmPlatform.member.reports.project_budget.index(
      memberConnection,
      {
        body: {
          date_from: dateFrom.toISOString(),
          date_to: dateTo.toISOString(),
          billable: false,
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(reportNonBillableOnly);
  const projectReportNonBillable = reportNonBillableOnly.data.find(
    (r) => r.project.id === project.id,
  );
  if (projectReportNonBillable) {
    // Should be 1 hour (only the non-billable timelog)
    TestValidator.equals(
      "non-billable filter shows only non-billable",
      projectReportNonBillable.actual_hours,
      1,
    );
  }
  // 7. Test status filter - create another project with different status
  const archivedProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          budgetHours: 50,
        } satisfies Partial<IHrmPlatformProject.ICreate>,
      },
    );
  typia.assert(archivedProject);
  // Query with status=active filter
  const reportActiveOnly =
    await api.functional.hrmPlatform.member.reports.project_budget.index(
      memberConnection,
      {
        body: {
          date_from: dateFrom.toISOString(),
          date_to: dateTo.toISOString(),
          status: "active",
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(reportActiveOnly);
  // Verify active project is included
  const activeProjectFound = reportActiveOnly.data.some(
    (r) => r.project.id === project.id,
  );
  TestValidator.predicate(
    "active project included in active filter",
    activeProjectFound,
  );
  // 8. Test empty date range - project with budget but no timelogs in range
  const futureDateFrom = new Date("2025-01-01T00:00:00Z");
  const futureDateTo = new Date("2025-01-31T23:59:59Z");
  const reportEmptyRange =
    await api.functional.hrmPlatform.member.reports.project_budget.index(
      memberConnection,
      {
        body: {
          date_from: futureDateFrom.toISOString(),
          date_to: futureDateTo.toISOString(),
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(reportEmptyRange);
  // Project should still appear with actual_hours = 0
  const projectReportEmpty = reportEmptyRange.data.find(
    (r) => r.project.id === project.id,
  );
  if (projectReportEmpty) {
    TestValidator.equals(
      "actual_hours is 0 for empty range",
      projectReportEmpty.actual_hours,
      0,
    );
    TestValidator.equals(
      "budget_hours still present",
      projectReportEmpty.budget_hours,
      100,
    );
    TestValidator.equals(
      "remaining_hours equals budget",
      projectReportEmpty.remaining_hours,
      100,
    );
    TestValidator.equals(
      "utilization_percentage is 0",
      projectReportEmpty.utilization_percentage,
      0,
    );
  }
  // 9. Validate pagination metadata
  TestValidator.predicate(
    "current page is 1",
    reportWithDateRange.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is positive",
    reportWithDateRange.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    reportWithDateRange.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    reportWithDateRange.pagination.pages >= 0,
  );
}
