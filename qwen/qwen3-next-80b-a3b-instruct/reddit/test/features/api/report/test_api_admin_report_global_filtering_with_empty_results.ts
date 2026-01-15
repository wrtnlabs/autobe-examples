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
export async function test_api_admin_report_global_filtering_with_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
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
  // Step 2: Prepare request body with future date range to ensure zero results
  const request: ICommunityPlatformReport.IRequest = {
    reporter_id: typia.random<string & tags.Format<"uuid">>(),
    reason_type: "spam", // Specific reason to filter
    status: "resolved", // Specific status to filter
    start_date: "2050-01-01T00:00:00.000Z", // Future date, no historical data
    end_date: "2050-12-31T23:59:59.999Z", // Future date, no historical data
    limit: 20, // Default limit
  } satisfies ICommunityPlatformReport.IRequest;
  // Step 3: Call the admin report index endpoint with filtering criteria
  const result: IPageICommunityPlatformReport =
    await api.functional.communityPlatform.admin.reports.index(
      adminConnection,
      {
        body: request,
      },
    );
  typia.assert(result);
  // Step 4: Validate pagination metadata for zero results
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 20);
  TestValidator.equals("pagination records", result.pagination.records, 0);
  TestValidator.equals("pagination pages", result.pagination.pages, 0);
  // Step 5: Validate data array is empty
  TestValidator.equals("data array length", result.data.length, 0);
}
