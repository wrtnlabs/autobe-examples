import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectBudgetReport";
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

/**
 * Test date range filtering for timelogs in project budget utilization reports.
 *
 * Validates that the budget report endpoint correctly accepts and processes date range parameters (dateFrom, dateTo) for filtering timelog aggregation. The response structure includes pagination metadata and per-project budget summaries with actual hours and timelog counts filtered by the specified date boundaries.
 *
 * The budget report returns budget_hours as the full project budget (unaffected by date filtering), while actual_hours and timelog_count reflect only timelogs within the date range. Utilization percentage is computed from the filtered actuals against the full budget.
 *
 * 1. Authenticate member via join endpoint to obtain authorization token.
 * 2. Call budget report API with dateFrom and dateTo parameters in ISO 8601 format.
 * 3. Validate response structure: pagination metadata and budget summary entries.
 * 4. Verify each summary contains required fields: project_id, project_name, budget_hours, actual_hours, timelog_count, utilization_percentage.
 */
export async function test_api_project_budget_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Define date range for filtering timelogs
  const dateFrom = new Date("2024-01-01T00:00:00Z").toISOString();
  const dateTo = new Date("2024-03-31T23:59:59Z").toISOString();
  // 3. Call budget report with date range filter
  const report =
    await api.functional.hrmPlatform.member.reports.project_budget.index(
      memberConnection,
      {
        body: {
          dateFrom,
          dateTo,
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(report);
  // 4. Validate pagination structure
  typia.assert(report.pagination);
  TestValidator.predicate(
    "pagination has current page",
    report.pagination.current >= 1,
  );
  TestValidator.predicate("pagination has limit", report.pagination.limit >= 1);
  TestValidator.predicate(
    "pagination has total records count",
    report.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has total pages",
    report.pagination.pages >= 0,
  );
  // 5. Validate data array structure
  TestValidator.predicate("data is an array", Array.isArray(report.data));
  // 6. Validate each budget summary entry has required fields with valid values
  for (const summary of report.data) {
    typia.assert(summary);
    TestValidator.predicate(
      `project has actual_hours >= 0: ${summary.actual_hours}`,
      summary.actual_hours >= 0,
    );
    TestValidator.predicate(
      `project has timelog_count >= 0: ${summary.timelog_count}`,
      summary.timelog_count >= 0,
    );
    // budget_hours can be null if no budget set
    if (summary.budget_hours !== null) {
      TestValidator.predicate(
        `project has positive budget: ${summary.budget_hours}`,
        summary.budget_hours > 0,
      );
    }
    // utilization_percentage can be null if budget is null or zero
    if (summary.utilization_percentage !== null) {
      TestValidator.predicate(
        `utilization percentage is valid: ${summary.utilization_percentage}`,
        summary.utilization_percentage >= 0,
      );
    }
  }
  // 7. Test with additional filter combinations
  const filteredReport =
    await api.functional.hrmPlatform.member.reports.project_budget.index(
      memberConnection,
      {
        body: {
          dateFrom,
          dateTo,
          status: "active",
          billable: true,
        } satisfies IHrmPlatformProjectBudgetReport.IRequest,
      },
    );
  typia.assert(filteredReport);
  TestValidator.predicate(
    "filtered report has pagination",
    filteredReport.pagination.current >= 1,
  );
}
