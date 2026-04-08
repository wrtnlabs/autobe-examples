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
 * Test retrieving weekly summary report with empty timelog data.
 *
 * Validates the weekly summary report endpoint's behavior when no time tracking data exists in the specified period. This edge case ensures the reporting feature gracefully handles organizations or periods without any timelog entries.
 *
 * The test verifies that the response structure remains valid with empty datasets, and that pagination metadata correctly reflects zero records. Organization scoping validation is confirmed to still occur even when no data exists.
 *
 * 1. Register a new member account with email and password credentials.
 * 2. Create member-specific connection with authentication token.
 * 3. Call weekly summary report endpoint with date range having no timelogs.
 * 4. Validate response structure and pagination metadata.
 * 5. Verify empty data array with records=0 and pages=0.
 */
export async function test_api_weekly_summary_report_empty_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await api.functional.hrm.auth.member.join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(auth);
  // 2. Create member-specific connection with token
  const memberAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${auth.token.access}`,
    },
  };
  // 3. Call weekly summary report with date range that has no timelogs
  // Use a past date range to ensure no timelogs exist
  const pastStartDate = new Date();
  pastStartDate.setFullYear(pastStartDate.getFullYear() - 2);
  const pastEndDate = new Date(pastStartDate);
  pastEndDate.setDate(pastEndDate.getDate() + 7);
  // Use a valid organizationId format - backend will handle organization scoping
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const report =
    await api.functional.hrm.member.organizations.reports.weekly_summary.index(
      memberAuthConnection,
      {
        organizationId,
        body: {
          start_date: pastStartDate.toISOString().split("T")[0],
          end_date: pastEndDate.toISOString().split("T")[0],
          page: 1,
          limit: 10,
        } satisfies IHrmWeeklySummaryReport.IRequest,
      },
    );
  typia.assert(report);
  // 4. Validate pagination metadata
  TestValidator.equals("current page is 1", report.pagination.current, 1);
  TestValidator.equals("limit matches request", report.pagination.limit, 10);
  TestValidator.equals("records count is 0", report.pagination.records, 0);
  TestValidator.equals("pages count is 0", report.pagination.pages, 0);
  // 5. Verify empty data array
  TestValidator.equals("data array is empty", report.data.length, 0);
}
