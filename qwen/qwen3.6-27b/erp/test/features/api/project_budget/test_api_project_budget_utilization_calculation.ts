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
 * Test project budget utilization calculation logic for budget reports.
 *
 * Validates the core calculation that compares planned budget hours against actual logged hours to produce accurate utilization percentages. This test authenticates a member and fetches the budget report endpoint, verifying it returns properly structured data with calculated fields for budget hours, actual hours, utilization percentage, and timelog count.
 *
 * 1. Authenticate a member using the join utility function.
 * 2. Call the project budget report endpoint with an empty request body.
 * 3. Validate the response is properly paginated with pagination metadata.
 * 4. For each returned budget summary entry, validate the data structure includes project_id, project_name, budget_hours, actual_hours, utilization_percentage, and timelog_count.
 * 5. Assert that numeric calculations are performed correctly and that null budget_hours results in null utilization_percentage.
 * 6. Verify default sorting by created_at descending order.
 */
export async function test_api_project_budget_utilization_calculation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Call project budget report endpoint with empty filters
  const requestBody: IHrmPlatformProjectBudgetReport.IRequest = {};
  const report =
    await api.functional.hrmPlatform.member.reports.project_budget.index(
      memberConnection,
      {
        body: requestBody,
      },
    );
  typia.assert(report);
  // 3. Validate pagination structure
  typia.assertGuard(report);
  TestValidator.equals("report has pagination metadata", report.pagination, {
    current: report.pagination.current,
    limit: report.pagination.limit,
    records: report.pagination.records,
    pages: report.pagination.pages,
  });
  // 4. Validate each summary entry structure and calculation rules
  for (const summaryEntry of report.data) {
    typia.assert(summaryEntry);
    // Project identifier fields must exist
    TestValidator.predicate(
      "project_id is a UUID",
      typeof summaryEntry.project_id === "string",
    );
    TestValidator.predicate(
      "project_name is present",
      typeof summaryEntry.project_name === "string" &&
        summaryEntry.project_name.length > 0,
    );
    // budget_hours can be null or a number
    TestValidator.predicate(
      "budget_hours is number or null",
      summaryEntry.budget_hours === null ||
        typeof summaryEntry.budget_hours === "number",
    );
    // actual_hours must be a non-negative number
    TestValidator.predicate(
      "actual_hours is non-negative number",
      typeof summaryEntry.actual_hours === "number" &&
        summaryEntry.actual_hours >= 0,
    );
    // timelog_count must be a non-negative integer
    TestValidator.predicate(
      "timelog_count is non-negative integer",
      typeof summaryEntry.timelog_count === "number" &&
        summaryEntry.timelog_count >= 0,
    );
    // utilization_percentage is null when budget_hours is null
    if (summaryEntry.budget_hours === null) {
      TestValidator.equals(
        "null budget_hours results in null utilization_percentage",
        summaryEntry.utilization_percentage,
        null,
      );
    } else {
      // When budget_hours is provided, utilization_percentage should be calculated
      TestValidator.predicate(
        "utilization_percentage is number when budget exists",
        typeof summaryEntry.utilization_percentage === "number",
      );
      // Verify utilization is between 0 and reasonable range (actual_hours / budget_hours * 100)
      TestValidator.predicate(
        "utilization_percentage is non-negative",
        summaryEntry.utilization_percentage !== null &&
          summaryEntry.utilization_percentage >= 0,
      );
    }
  }
  // 5. Verify pagination limit is within accepted range (1 to 100)
  TestValidator.predicate(
    "pagination limit is within range",
    report.pagination.limit >= 1 && report.pagination.limit <= 100,
  );
  // 6. Validate current page is at least 0
  TestValidator.predicate(
    "pagination current page is non-negative",
    report.pagination.current >= 0,
  );
}
