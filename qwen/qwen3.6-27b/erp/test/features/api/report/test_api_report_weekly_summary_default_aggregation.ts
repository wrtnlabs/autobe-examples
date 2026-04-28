import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIWeeklySummaryReport";
import type { IWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeeklySummaryReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Validate default weekly summary report retrieval without any filters.
 *
 * Tests that an authenticated member can retrieve the weekly summary report with all default settings. The report aggregates timelog data by ISO calendar weeks (Monday through Sunday), computing total_hours, timelog_count, and employee_count for each week. Without filters, results span all projects and date ranges for the member's organization. The endpoint returns paginated results with cursor-based navigation support.
 *
 * Since a freshly created member has no timelog data, this test validates the correct empty response structure is returned, confirming the endpoint handles organizations with no activity gracefully and returns valid pagination metadata.
 *
 * 1. Register and authenticate a new member account with default organization.
 * 2. Request weekly summary report with no filters (empty body).
 * 3. Validate response structure matches paginated weekly summary type.
 * 4. Verify pagination metadata is present with valid values.
 * 5. Confirm data array exists (expected to be empty for new organization).
 */
export async function test_api_report_weekly_summary_default_aggregation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Request weekly summary with default settings (no filters)
  const body: IWeeklySummaryReport.IRequest = {};
  const report =
    await api.functional.hrmPlatform.member.reports.weekly_summary.index(
      memberConnection,
      { body },
    );
  typia.assert(report);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is non-negative",
    report.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    report.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination total records is non-negative",
    report.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages is non-negative",
    report.pagination.pages >= 0,
  );
  // 4. Validate data array exists and is empty for new organization
  TestValidator.predicate("data array exists", Array.isArray(report.data));
  TestValidator.equals(
    "no weekly summaries for new organization",
    report.data.length,
    0,
  );
}
