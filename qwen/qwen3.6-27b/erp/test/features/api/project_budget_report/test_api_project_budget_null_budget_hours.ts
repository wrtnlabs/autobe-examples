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
 * Test that projects without a defined budget correctly return null values while still showing actual logged hours.
 *
 * Validates the project budget report endpoint gracefully handles projects lacking a budget field, returning appropriate null sentinel values for budget-hours and utilization-percentage while accurately computing actual hours and timelog counts from existing time entries.
 *
 * Confirms that utilization_percentage remains null rather than defaulting to zero, preventing misleading reports when no budget exists. The endpoint must not crash or throw errors when processing projects with null budget_hours.
 *
 * 1. Member joins and authenticates to the platform.
 * 2. Project budget report endpoint is called with an empty request body.
 * 3. Validates that the report response is valid and properly paginated.
 * 4. For any project entries returned, verifies budget-related fields are correctly typed (budget_hours: number | null, utilization_percentage: number | null).
 * 5. Validates that actual_hours is a non-negative number and timelog_count is valid for each entry.
 * 6. Confirms the endpoint succeeds without errors, indicating proper null budget handling.
 */
export async function test_api_project_budget_null_budget_hours(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Retrieve budget report (may contain projects with null budgets)
  const report: IPageIHrmPlatformProjectBudgetReport.ISummary =
    await api.functional.hrmPlatform.member.reports.project_budget.index(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(report);
  // 3. Validate report structure
  const summary: IHrmPlatformProjectBudgetReport.ISummary[] = report.data;
  typia.assert(summary);
  // 4. Validate each project entry handles budget fields correctly
  await ArrayUtil.asyncForEach(summary, async (entry) => {
    typia.assert(entry);
    // budget_hours can be number or null
    TestValidator.predicate(
      `valid budget_hours for ${entry.project_name}`,
      entry.budget_hours === null || typeof entry.budget_hours === "number",
    );
    // utilization_percentage can be number or null
    TestValidator.predicate(
      `valid utilization_percentage for ${entry.project_name}`,
      entry.utilization_percentage === null ||
        typeof entry.utilization_percentage === "number",
    );
    // actual_hours must be a non-negative number
    TestValidator.predicate(
      `actual_hours is non-negative for ${entry.project_name}`,
      entry.actual_hours >= 0,
    );
    // timelog_count must be a valid integer >= 0
    TestValidator.predicate(
      `timelog_count is valid for ${entry.project_name}`,
      entry.timelog_count >= 0,
    );
    // If budget is null, utilization must also be null (no division)
    if (entry.budget_hours === null) {
      TestValidator.equals(
        `null budget yields null utilization for ${entry.project_name}`,
        entry.utilization_percentage,
        null,
      );
    }
  });
  // 5. Validate pagination
  TestValidator.predicate(
    "pagination records matches data length",
    report.pagination.records >= summary.length,
  );
}
