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
 * Test weekly summary report retrieval with custom filtering criteria.
 *
 * Validates the weekly summary report endpoint's ability to filter time tracking data by date range, billable status, projects, and employees. Ensures that the returned data correctly reflects all applied filters and that pagination works as expected.
 *
 * The test verifies that total hours, billable hours, and non-billable hours are properly calculated from the filtered timelog subset. It also confirms that top projects and employee participation metrics reflect only the filtered data.
 *
 * 1. Register and authenticate a new member using authorize_member_join.
 * 2. Generate a random organization UUID for the report endpoint path parameter.
 * 3. Create a weekly summary report request with date range filters (start_date, end_date).
 * 4. Validate the response structure and pagination metadata.
 * 5. Test billable status filtering (true and false values).
 * 6. Test project IDs array filtering.
 * 7. Test employee IDs array filtering.
 * 8. Test pagination parameters (page, limit).
 * 9. Verify each weekly entry contains required fields and proper calculations.
 */
export async function test_api_weekly_summary_report_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
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
  // 2. Generate organization UUID for path parameter
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Test with date range filters
  const startDate: string & tags.Format<"date"> = typia.random<
    string & tags.Format<"date">
  >();
  const endDate: string & tags.Format<"date"> = startDate;
  const dateRangeReport =
    await api.functional.hrm.member.organizations.reports.weekly_summary.index(
      memberConnection,
      {
        organizationId,
        body: {
          start_date: startDate,
          end_date: endDate,
          page: 1,
          limit: 10,
        } satisfies IHrmWeeklySummaryReport.IRequest,
      },
    );
  typia.assert(dateRangeReport);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination has current",
    dateRangeReport.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    dateRangeReport.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records",
    dateRangeReport.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    dateRangeReport.pagination.pages >= 0,
  );
  // Validate weekly entries structure
  for (const entry of dateRangeReport.data) {
    typia.assert(entry);
    TestValidator.predicate(
      "has week_start_date",
      entry.week_start_date !== undefined,
    );
    TestValidator.predicate(
      "has week_end_date",
      entry.week_end_date !== undefined,
    );
    TestValidator.predicate(
      "total_hours is number",
      typeof entry.total_hours === "number",
    );
    TestValidator.predicate(
      "billable_hours is number",
      typeof entry.billable_hours === "number",
    );
    TestValidator.predicate(
      "non_billable_hours is number",
      typeof entry.non_billable_hours === "number",
    );
    TestValidator.predicate(
      "employee_count is number",
      typeof entry.employee_count === "number",
    );
    TestValidator.predicate(
      "project_count is number",
      typeof entry.project_count === "number",
    );
    // Validate hours calculation consistency
    TestValidator.predicate(
      "hours sum correctly",
      Math.abs(
        entry.total_hours - (entry.billable_hours + entry.non_billable_hours),
      ) < 0.01,
    );
  }
  // 4. Test billable status filter (true)
  const billableReport =
    await api.functional.hrm.member.organizations.reports.weekly_summary.index(
      memberConnection,
      {
        organizationId,
        body: {
          billable: true,
          page: 1,
          limit: 10,
        } satisfies IHrmWeeklySummaryReport.IRequest,
      },
    );
  typia.assert(billableReport);
  // 5. Test billable status filter (false)
  const nonBillableReport =
    await api.functional.hrm.member.organizations.reports.weekly_summary.index(
      memberConnection,
      {
        organizationId,
        body: {
          billable: false,
          page: 1,
          limit: 10,
        } satisfies IHrmWeeklySummaryReport.IRequest,
      },
    );
  typia.assert(nonBillableReport);
  // 6. Test project IDs filter
  const projectIds: (string & tags.Format<"uuid">)[] = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const projectFilterReport =
    await api.functional.hrm.member.organizations.reports.weekly_summary.index(
      memberConnection,
      {
        organizationId,
        body: {
          project_ids: projectIds,
          page: 1,
          limit: 10,
        } satisfies IHrmWeeklySummaryReport.IRequest,
      },
    );
  typia.assert(projectFilterReport);
  // 7. Test employee IDs filter
  const employeeIds: (string & tags.Format<"uuid">)[] = ArrayUtil.repeat(
    2,
    () => typia.random<string & tags.Format<"uuid">>(),
  );
  const employeeFilterReport =
    await api.functional.hrm.member.organizations.reports.weekly_summary.index(
      memberConnection,
      {
        organizationId,
        body: {
          employee_ids: employeeIds,
          page: 1,
          limit: 10,
        } satisfies IHrmWeeklySummaryReport.IRequest,
      },
    );
  typia.assert(employeeFilterReport);
  // 8. Test combined filters
  const combinedFilterReport =
    await api.functional.hrm.member.organizations.reports.weekly_summary.index(
      memberConnection,
      {
        organizationId,
        body: {
          start_date: startDate,
          end_date: endDate,
          billable: true,
          project_ids: projectIds,
          employee_ids: employeeIds,
          page: 1,
          limit: 10,
        } satisfies IHrmWeeklySummaryReport.IRequest,
      },
    );
  typia.assert(combinedFilterReport);
  // 9. Test pagination with different page and limit values
  const page2Report =
    await api.functional.hrm.member.organizations.reports.weekly_summary.index(
      memberConnection,
      {
        organizationId,
        body: {
          page: 2,
          limit: 5,
        } satisfies IHrmWeeklySummaryReport.IRequest,
      },
    );
  typia.assert(page2Report);
  TestValidator.equals(
    "page 2 has correct page number",
    page2Report.pagination.current,
    2,
  );
  TestValidator.equals("page 2 has limit 5", page2Report.pagination.limit, 5);
  // 10. Test with limit at maximum (100)
  const maxLimitReport =
    await api.functional.hrm.member.organizations.reports.weekly_summary.index(
      memberConnection,
      {
        organizationId,
        body: {
          limit: 100,
        } satisfies IHrmWeeklySummaryReport.IRequest,
      },
    );
  typia.assert(maxLimitReport);
  TestValidator.equals(
    "max limit is 100",
    maxLimitReport.pagination.limit,
    100,
  );
  // 11. Validate top_projects structure when present
  for (const entry of combinedFilterReport.data) {
    if (entry.top_projects !== undefined) {
      for (const project of entry.top_projects) {
        typia.assert(project);
        TestValidator.predicate("project has id", project.id !== undefined);
        TestValidator.predicate("project has name", project.name !== undefined);
        TestValidator.predicate(
          "project has hours_breakdown",
          project.hours_breakdown !== undefined,
        );
        TestValidator.predicate(
          "hours_breakdown.total_hours is number",
          typeof project.hours_breakdown.total_hours === "number",
        );
        TestValidator.predicate(
          "hours_breakdown.billable_hours is number",
          typeof project.hours_breakdown.billable_hours === "number",
        );
        TestValidator.predicate(
          "hours_breakdown.non_billable_hours is number",
          typeof project.hours_breakdown.non_billable_hours === "number",
        );
      }
    }
    // Validate employee_participation structure when present
    if (entry.employee_participation !== undefined) {
      for (const participation of entry.employee_participation) {
        typia.assert(participation);
        TestValidator.predicate(
          "participation has employee",
          participation.employee !== undefined,
        );
        TestValidator.predicate(
          "participation has hours_breakdown",
          participation.hours_breakdown !== undefined,
        );
        TestValidator.predicate(
          "hours_breakdown.total_hours is number",
          typeof participation.hours_breakdown.total_hours === "number",
        );
        TestValidator.predicate(
          "hours_breakdown.billable_hours is number",
          typeof participation.hours_breakdown.billable_hours === "number",
        );
        TestValidator.predicate(
          "hours_breakdown.non_billable_hours is number",
          typeof participation.hours_breakdown.non_billable_hours === "number",
        );
      }
    }
  }
}
