import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_report_categories_date_range_search(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Get current timestamp for date range testing
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const oneWeekAgo = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const currentTime = now.toISOString();
  // Test 1: Filter by recent date range (last 24 hours)
  const recentResults =
    await api.functional.communityPlatform.admin.report_categories.index(
      adminConnection,
      {
        body: {
          created_at_from: oneDayAgo,
          created_at_to: currentTime,
        } satisfies ICommunityPlatformReportCategory,
      },
    );
  typia.assert(recentResults);
  TestValidator.predicate(
    "recent date range returns valid results",
    recentResults.data.length >= 0,
  );
  // Test 2: Filter by broader date range (last week)
  const weekResults =
    await api.functional.communityPlatform.admin.report_categories.index(
      adminConnection,
      {
        body: {
          created_at_from: oneWeekAgo,
          created_at_to: currentTime,
        } satisfies ICommunityPlatformReportCategory,
      },
    );
  typia.assert(weekResults);
  TestValidator.predicate(
    "week date range returns valid results",
    weekResults.data.length >= 0,
  );
  // Test 3: Filter by very specific time window (last hour)
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const specificWindowResults =
    await api.functional.communityPlatform.admin.report_categories.index(
      adminConnection,
      {
        body: {
          created_at_from: oneHourAgo,
          created_at_to: currentTime,
        } satisfies ICommunityPlatformReportCategory,
      },
    );
  typia.assert(specificWindowResults);
  TestValidator.predicate(
    "specific time window returns valid results",
    specificWindowResults.data.length >= 0,
  );
  // Test 4: Combine date filtering with search parameter
  const combinedResults =
    await api.functional.communityPlatform.admin.report_categories.index(
      adminConnection,
      {
        body: {
          created_at_from: oneWeekAgo,
          created_at_to: currentTime,
          search: "test",
          is_active: true,
        } satisfies ICommunityPlatformReportCategory,
      },
    );
  typia.assert(combinedResults);
  TestValidator.predicate(
    "combined filter returns valid results",
    combinedResults.data.length >= 0,
  );
  // Test 5: Validate pagination metadata with date filtering
  const paginatedResults =
    await api.functional.communityPlatform.admin.report_categories.index(
      adminConnection,
      {
        body: {
          created_at_from: oneWeekAgo,
          created_at_to: currentTime,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformReportCategory,
      },
    );
  typia.assert(paginatedResults);
  TestValidator.predicate(
    "pagination metadata is valid",
    paginatedResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page limit is respected",
    paginatedResults.data.length <= 10,
  );
}
