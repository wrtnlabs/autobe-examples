import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectBudgetReport";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { generate_random_hrm_member_organizations_timelogs_create } from "../../../generate/generate_random_hrm_member_organizations_timelogs_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_timelog } from "../../../prepare/prepare_random_hrm_timelog";

/**
 * Test project budget report with timelogs for accurate budget utilization tracking.
 *
 * Validates the project budget report endpoint's ability to correctly calculate and return budget utilization data by aggregating timelog durations against project budget allocations. The test ensures proper handling of projects with and without budgets, accurate hour calculations, percentage computations, and sorting order.
 *
 * Special attention is given to verifying division by zero handling when budget_hours is zero, and confirming that only projects with specified budget hours are included in the report regardless of their status (active, archived, or completed).
 *
 * 1. Authenticate as member user with report:view permission.
 * 2. Create multiple projects with varying budget_hours allocations (some with budget, some without).
 * 3. Create timelog entries for selected projects to generate actual logged hours.
 * 4. Call the project budget report endpoint.
 * 5. Validate response includes only projects with budget_hours specified.
 * 6. Verify actual_hours calculation matches sum of timelog durations converted to hours.
 * 7. Verify percentage_consumed is calculated correctly as (actual_hours / budget_hours) * 100.
 * 8. Confirm projects are sorted by percentage_consumed in descending order.
 * 9. Validate division by zero handling returns 0% when budget_hours is zero.
 */
export async function test_api_project_budget_report_with_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(auth);
  // Use organization from auth response (member should have at least one organization)
  const organizationId = auth.organizations?.[0]?.id;
  TestValidator.predicate(
    "member has organization",
    organizationId !== undefined,
  );
  // 2. Create multiple projects with different budget allocations
  // Project with budget hours
  const projectWithBudget =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        params: { organizationId: organizationId! },
        body: {
          name: RandomGenerator.name(),
          color_code: typia.random<
            string & tags.Pattern<"^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$">
          >(),
          status: "active",
          budget_hours: 100, // 100 hours budget
        } satisfies IHrmProject.ICreate,
      },
    );
  typia.assert(projectWithBudget);
  // Project with zero budget hours (division by zero test)
  const projectZeroBudget =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        params: { organizationId: organizationId! },
        body: {
          name: RandomGenerator.name(),
          color_code: typia.random<
            string & tags.Pattern<"^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$">
          >(),
          status: "active",
          budget_hours: 0, // Zero budget
        } satisfies IHrmProject.ICreate,
      },
    );
  typia.assert(projectZeroBudget);
  // Project without budget hours (should be excluded from report)
  const projectNoBudget =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        params: { organizationId: organizationId! },
        body: {
          name: RandomGenerator.name(),
          color_code: typia.random<
            string & tags.Pattern<"^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$">
          >(),
          status: "active",
          // No budget_hours specified
        } satisfies IHrmProject.ICreate,
      },
    );
  typia.assert(projectNoBudget);
  // Project with smaller budget for higher percentage test
  const projectSmallBudget =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        params: { organizationId: organizationId! },
        body: {
          name: RandomGenerator.name(),
          color_code: typia.random<
            string & tags.Pattern<"^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$">
          >(),
          status: "active",
          budget_hours: 10, // Small budget for high percentage
        } satisfies IHrmProject.ICreate,
      },
    );
  typia.assert(projectSmallBudget);
  // 3. Create timelogs for selected projects
  // Timelogs for project with 100 hours budget (50 hours logged = 50%)
  const timelog1 =
    await generate_random_hrm_member_organizations_timelogs_create(
      memberConnection,
      {
        params: { organizationId: organizationId! },
        body: {
          hrm_project_id: projectWithBudget.id,
          date: new Date().toISOString(),
          duration_minutes: 3000, // 50 hours in minutes
          billable: true,
        } satisfies IHrmTimelog.ICreate,
      },
    );
  typia.assert(timelog1);
  // Timelogs for project with 10 hours budget (12 hours logged = 120%)
  const timelog2 =
    await generate_random_hrm_member_organizations_timelogs_create(
      memberConnection,
      {
        params: { organizationId: organizationId! },
        body: {
          hrm_project_id: projectSmallBudget.id,
          date: new Date().toISOString(),
          duration_minutes: 720, // 12 hours in minutes
          billable: true,
        } satisfies IHrmTimelog.ICreate,
      },
    );
  typia.assert(timelog2);
  // No timelogs for projectZeroBudget (to test 0% with zero budget)
  // No timelogs for projectNoBudget (should be excluded anyway)
  // 4. Call the project budget report endpoint
  const reportRaw =
    await api.functional.hrm.member.organizations.reports.project_budget.projectBudget(
      memberConnection,
      {
        organizationId: organizationId!,
      },
    );
  typia.assert(reportRaw);
  // Handle both single object and array responses
  const report: IHrmProjectBudgetReport[] = Array.isArray(reportRaw)
    ? reportRaw
    : [reportRaw];
  // 5. Validate response structure
  TestValidator.predicate("report is array", Array.isArray(report));
  // 6. Validate only projects with budget_hours are included
  const projectIdsInReport = report.map((r) => r.project_id);
  TestValidator.predicate(
    "project with budget included",
    projectIdsInReport.includes(projectWithBudget.id),
  );
  TestValidator.predicate(
    "project with zero budget included",
    projectIdsInReport.includes(projectZeroBudget.id),
  );
  TestValidator.predicate(
    "project with small budget included",
    projectIdsInReport.includes(projectSmallBudget.id),
  );
  TestValidator.predicate(
    "project without budget excluded",
    !projectIdsInReport.includes(projectNoBudget.id),
  );
  // 7. Verify actual_hours and percentage calculations
  const projectWithBudgetReport = report.find(
    (r) => r.project_id === projectWithBudget.id,
  );
  TestValidator.predicate(
    "project with budget found in report",
    projectWithBudgetReport !== undefined,
  );
  if (projectWithBudgetReport) {
    // 50 hours logged (3000 minutes / 60)
    TestValidator.equals(
      "actual hours for project with budget",
      projectWithBudgetReport.actual_hours,
      50,
    );
    // 50% consumed (50 / 100 * 100)
    TestValidator.equals(
      "percentage consumed for project with budget",
      projectWithBudgetReport.percentage_consumed,
      50,
    );
  }
  const projectSmallBudgetReport = report.find(
    (r) => r.project_id === projectSmallBudget.id,
  );
  TestValidator.predicate(
    "project with small budget found in report",
    projectSmallBudgetReport !== undefined,
  );
  if (projectSmallBudgetReport) {
    // 12 hours logged (720 minutes / 60)
    TestValidator.equals(
      "actual hours for project with small budget",
      projectSmallBudgetReport.actual_hours,
      12,
    );
    // 120% consumed (12 / 10 * 100)
    TestValidator.equals(
      "percentage consumed for project with small budget",
      projectSmallBudgetReport.percentage_consumed,
      120,
    );
  }
  const projectZeroBudgetReport = report.find(
    (r) => r.project_id === projectZeroBudget.id,
  );
  TestValidator.predicate(
    "project with zero budget found in report",
    projectZeroBudgetReport !== undefined,
  );
  if (projectZeroBudgetReport) {
    // 0 hours logged
    TestValidator.equals(
      "actual hours for project with zero budget",
      projectZeroBudgetReport.actual_hours,
      0,
    );
    // 0% consumed (division by zero handling)
    TestValidator.equals(
      "percentage consumed for project with zero budget",
      projectZeroBudgetReport.percentage_consumed,
      0,
    );
  }
  // 8. Verify sorting by percentage_consumed descending
  const percentages = report.map((r) => r.percentage_consumed);
  const sortedPercentages = [...percentages].sort((a, b) => b - a);
  TestValidator.equals(
    "projects sorted by percentage consumed descending",
    JSON.stringify(percentages),
    JSON.stringify(sortedPercentages),
  );
}
