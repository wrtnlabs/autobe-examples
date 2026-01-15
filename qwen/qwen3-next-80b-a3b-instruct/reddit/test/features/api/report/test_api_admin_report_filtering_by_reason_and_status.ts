import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_report_filtering_by_reason_and_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/admin/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Generate unique reporter ID for test
  const reporterId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Define filters for the test using correct union types
  const filterParams = {
    reporter_id: reporterId,
    reason_type: "harassment" as const,
    status: "pending" as const,
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // last 30 days
    end_date: new Date().toISOString(), // up to current time
    limit: 10,
    offset: 0,
  } satisfies ICommunityPlatformReport.IRequest;
  // Step 4: Make the filtered report request
  const response = await api.functional.communityPlatform.admin.reports.index(
    adminConnection,
    { body: filterParams },
  );
  typia.assert(response);
  // Step 5: Validate response structure
  TestValidator.equals(
    "pagination limit matches request",
    response.pagination.limit,
    filterParams.limit,
  );
  TestValidator.predicate(
    "pagination current is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination records is consistent with data length",
    response.pagination.records >= response.data.length,
  );
  TestValidator.predicate(
    "pagination pages is calculated correctly",
    response.pagination.pages >= 1,
  );
  // Step 6: Validate that returned reports contain the correct properties
  // The ICommunityPlatformReport type only has three properties:
  // daily_report_rate, weekly_growth_rate, monthly_growth_rate
  response.data.forEach((report, index) => {
    // Validate daily_report_rate is a number >= 0
    TestValidator.predicate(
      "daily_report_rate is a non-negative number",
      typeof report.daily_report_rate === "number" &&
        report.daily_report_rate >= 0,
    );
    // Validate weekly_growth_rate is a number between -1 and 1
    TestValidator.predicate(
      "weekly_growth_rate is a number between -1 and 1",
      typeof report.weekly_growth_rate === "number" &&
        report.weekly_growth_rate >= -1 &&
        report.weekly_growth_rate <= 1,
    );
    // Validate monthly_growth_rate is a number between -1 and 1
    TestValidator.predicate(
      "monthly_growth_rate is a number between -1 and 1",
      typeof report.monthly_growth_rate === "number" &&
        report.monthly_growth_rate >= -1 &&
        report.monthly_growth_rate <= 1,
    );
  });
  // Step 7: Validate pagination limits are respected
  TestValidator.equals(
    "number of reports returned matches limit",
    response.data.length,
    filterParams.limit,
  );
  // Step 8: Ensure response data is an array
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  // Step 9: Ensure data array is not empty if records > 0
  if (response.pagination.records > 0) {
    TestValidator.predicate(
      "data array is not empty when records > 0",
      response.data.length > 0,
    );
  }
}
