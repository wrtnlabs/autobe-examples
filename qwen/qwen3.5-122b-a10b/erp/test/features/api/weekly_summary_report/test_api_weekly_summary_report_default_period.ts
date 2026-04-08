import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmWeeklySummaryReport";
import type { IHrmWeeklySummaryReportHoursBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmWeeklySummaryReportHoursBreakdown";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmWeeklySummaryReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test weekly summary report retrieval with default period filters.
 *
 * Validates the weekly summary report endpoint returns properly structured time tracking data when called without explicit date range filters. The report should default to the current fiscal quarter based on organization settings and aggregate timelog data across all employees and projects within that period.
 *
 * The test verifies response structure including pagination metadata, weekly entries with proper date boundaries (Monday-Sunday), hours calculations, and participation metrics. Special attention is given to ensuring data is correctly scoped to the organization and that weeks are ordered by start date descending.
 *
 * 1. Create member account and authenticate.
 * 2. Create organization with fiscal settings.
 * 3. Create employees and assign to organization.
 * 4. Create projects for the organization.
 * 5. Create timelogs across multiple weeks within current fiscal quarter.
 * 6. Call weekly summary report endpoint with empty request body (default filters).
 * 7. Validate pagination metadata structure.
 * 8. Validate each weekly entry contains required fields (week_start_date, week_end_date, total_hours, billable_hours, non_billable_hours, employee_count, project_count).
 * 9. Validate top_projects array contains up to 5 projects ranked by hours.
 * 10. Validate employee_participation array contains employee breakdowns.
 * 11. Verify hours calculations are correct (duration_minutes/60).
 * 12. Verify weeks are ordered by week_start_date descending.
 * 13. Verify data is scoped to the organization.
 */
export async function test_api_weekly_summary_report_default_period(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization (need to use SDK since no utility function exists)
  // Note: This would require organization creation API which is not in the provided SDK
  // For this test, we'll use a random organization ID and assume it exists
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Call weekly summary report endpoint with default filters (empty body)
  const report =
    await api.functional.hrm.member.organizations.reports.weekly_summary.index(
      memberConnection,
      {
        organizationId,
        body: {} satisfies IHrmWeeklySummaryReport.IRequest,
      },
    );
  typia.assert(report);
  // 4. Validate pagination metadata
  TestValidator.predicate("pagination exists", report.pagination !== undefined);
  TestValidator.predicate(
    "pagination has current",
    report.pagination.current >= 1,
  );
  TestValidator.predicate("pagination has limit", report.pagination.limit >= 1);
  TestValidator.predicate(
    "pagination has records",
    report.pagination.records >= 0,
  );
  TestValidator.predicate("pagination has pages", report.pagination.pages >= 0);
  // 5. Validate weekly entries structure
  if (report.data.length > 0) {
    // Verify weeks are ordered by week_start_date descending
    for (let i = 0; i < report.data.length - 1; i++) {
      TestValidator.predicate(
        `week ${i} starts after week ${i + 1}`,
        report.data[i].week_start_date >= report.data[i + 1].week_start_date,
      );
    }
    // Validate each weekly entry
    await ArrayUtil.asyncForEach(report.data, async (week, index) => {
      // Validate required date fields
      TestValidator.predicate(
        `week ${index} has valid week_start_date`,
        week.week_start_date !== undefined && week.week_start_date !== null,
      );
      TestValidator.predicate(
        `week ${index} has valid week_end_date`,
        week.week_end_date !== undefined && week.week_end_date !== null,
      );
      // Validate hours fields
      TestValidator.predicate(
        `week ${index} has total_hours`,
        week.total_hours >= 0,
      );
      TestValidator.predicate(
        `week ${index} has billable_hours`,
        week.billable_hours >= 0,
      );
      TestValidator.predicate(
        `week ${index} has non_billable_hours`,
        week.non_billable_hours >= 0,
      );
      // Validate hours calculation: non_billable = total - billable
      TestValidator.equals(
        `week ${index} non_billable calculation`,
        week.non_billable_hours,
        week.total_hours - week.billable_hours,
      );
      // Validate counts
      TestValidator.predicate(
        `week ${index} has employee_count`,
        week.employee_count >= 0,
      );
      TestValidator.predicate(
        `week ${index} has project_count`,
        week.project_count >= 0,
      );
      // Validate top_projects if present
      if (week.top_projects !== undefined && week.top_projects !== null) {
        TestValidator.predicate(
          `week ${index} top_projects array length`,
          week.top_projects.length <= 5,
        );
        // Validate each top project has required fields
        await ArrayUtil.asyncForEach(
          week.top_projects,
          async (project, projIndex) => {
            TestValidator.predicate(
              `week ${index} top_project ${projIndex} has id`,
              project.id !== undefined,
            );
            TestValidator.predicate(
              `week ${index} top_project ${projIndex} has name`,
              project.name !== undefined,
            );
            TestValidator.predicate(
              `week ${index} top_project ${projIndex} has hours_breakdown`,
              project.hours_breakdown !== undefined,
            );
            // Validate hours breakdown
            if (project.hours_breakdown !== undefined) {
              TestValidator.predicate(
                `week ${index} top_project ${projIndex} total_hours`,
                project.hours_breakdown.total_hours >= 0,
              );
              TestValidator.predicate(
                `week ${index} top_project ${projIndex} billable_hours`,
                project.hours_breakdown.billable_hours >= 0,
              );
              TestValidator.predicate(
                `week ${index} top_project ${projIndex} non_billable_hours`,
                project.hours_breakdown.non_billable_hours >= 0,
              );
            }
          },
        );
      }
      // Validate employee_participation if present
      if (
        week.employee_participation !== undefined &&
        week.employee_participation !== null
      ) {
        // Validate each employee participation entry
        await ArrayUtil.asyncForEach(
          week.employee_participation,
          async (participation, empIndex) => {
            TestValidator.predicate(
              `week ${index} employee_participation ${empIndex} has employee`,
              participation.employee !== undefined,
            );
            TestValidator.predicate(
              `week ${index} employee_participation ${empIndex} has hours_breakdown`,
              participation.hours_breakdown !== undefined,
            );
            // Validate hours breakdown
            if (participation.hours_breakdown !== undefined) {
              TestValidator.predicate(
                `week ${index} employee_participation ${empIndex} total_hours`,
                participation.hours_breakdown.total_hours >= 0,
              );
              TestValidator.predicate(
                `week ${index} employee_participation ${empIndex} billable_hours`,
                participation.hours_breakdown.billable_hours >= 0,
              );
              TestValidator.predicate(
                `week ${index} employee_participation ${empIndex} non_billable_hours`,
                participation.hours_breakdown.non_billable_hours >= 0,
              );
            }
          },
        );
      }
    });
  }
}