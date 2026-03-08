import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardActivityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActivityReport";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardActivityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardActivityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_activity_report_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test with specific date range (past week)
  const now = new Date();
  const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const endDate = now;
  const reportPastWeek =
    await api.functional.discussionBoard.admin.reports.activity.index(
      adminConnection,
      {
        body: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          page: 1,
          pageSize: 10,
        } satisfies IDiscussionBoardActivityReport.IRequest,
      },
    );
  typia.assert(reportPastWeek);
  // 3. Test with past month date range
  const startDateMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const reportPastMonth =
    await api.functional.discussionBoard.admin.reports.activity.index(
      adminConnection,
      {
        body: {
          startDate: startDateMonth.toISOString(),
          endDate: endDate.toISOString(),
          page: 1,
          pageSize: 10,
        } satisfies IDiscussionBoardActivityReport.IRequest,
      },
    );
  typia.assert(reportPastMonth);
  // 4. Test with custom date range (narrower window)
  const customStart = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
  const customEnd = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
  const reportCustom =
    await api.functional.discussionBoard.admin.reports.activity.index(
      adminConnection,
      {
        body: {
          startDate: customStart.toISOString(),
          endDate: customEnd.toISOString(),
          page: 1,
          pageSize: 10,
        } satisfies IDiscussionBoardActivityReport.IRequest,
      },
    );
  typia.assert(reportCustom);
  // 5. Validate response structure
  TestValidator.equals(
    "past week report has pagination",
    reportPastWeek.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "past week report has data array",
    Array.isArray(reportPastWeek.data),
    true,
  );
  TestValidator.predicate(
    "past week total count non-negative",
    reportPastWeek.pagination.records >= 0,
  );
  TestValidator.predicate(
    "past month total count non-negative",
    reportPastMonth.pagination.records >= 0,
  );
  TestValidator.predicate(
    "custom range total count non-negative",
    reportCustom.pagination.records >= 0,
  );
  // 6. Validate date filtering logic - broader range should have >= records than narrower range
  TestValidator.predicate(
    "past month has >= records than past week",
    reportPastMonth.pagination.records >= reportPastWeek.pagination.records,
  );
  // 7. Validate activity counts are consistent
  if (reportPastWeek.data.length > 0) {
    const summary = reportPastWeek.data[0];
    TestValidator.predicate(
      "total_count >= member_activity_count",
      summary.total_count >= summary.member_activity_count,
    );
    TestValidator.predicate(
      "total_count >= admin_activity_count",
      summary.total_count >= summary.admin_activity_count,
    );
    TestValidator.equals(
      "summary has action_type_breakdown",
      typeof summary.action_type_breakdown === "object",
      true,
    );
  }
  // 8. Validate pagination structure
  TestValidator.predicate(
    "pagination current is number",
    typeof reportPastWeek.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination limit is number",
    typeof reportPastWeek.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination records is number",
    typeof reportPastWeek.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination pages is number",
    typeof reportPastWeek.pagination.pages === "number",
  );
  // 9. Validate summary report fields when data exists
  if (reportPastWeek.data.length > 0) {
    const summary = reportPastWeek.data[0];
    TestValidator.equals(
      "summary has valid id",
      typeof summary.id === "string",
      true,
    );
    TestValidator.predicate(
      "summary has start_date",
      summary.start_date !== undefined,
    );
    TestValidator.predicate(
      "summary has end_date",
      summary.end_date !== undefined,
    );
    TestValidator.predicate(
      "summary has created_at",
      summary.created_at !== undefined,
    );
  }
}
