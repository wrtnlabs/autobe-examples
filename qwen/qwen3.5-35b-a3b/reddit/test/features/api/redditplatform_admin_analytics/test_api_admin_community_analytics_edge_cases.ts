import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunityAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunityAnalytic";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunityAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_community_analytics_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(16),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph(),
      avatar_url: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  // 2. Test with filters matching no communities (high subscriber threshold)
  const highThresholdPage =
    await api.functional.redditPlatform.admin.analytics.communities.index(
      adminConnection,
      {
        body: {
          subscriberCountMin: 9999999,
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformCommunityAnalytic.IRequest,
      },
    );
  typia.assert(highThresholdPage);
  // 3. Test empty data response structure
  TestValidator.equals(
    "empty data array for high threshold",
    highThresholdPage.data.length,
    0,
  );
  TestValidator.equals(
    "records should be 0 for empty results",
    highThresholdPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages should be 0 for no records",
    highThresholdPage.pagination.pages,
    0,
  );
  // 4. Test pagination edge cases
  // Page 1 (first page)
  const page1 =
    await api.functional.redditPlatform.admin.analytics.communities.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformCommunityAnalytic.IRequest,
      },
    );
  typia.assert(page1);
  // 5. Page beyond total available pages
  const pageBeyond =
    await api.functional.redditPlatform.admin.analytics.communities.index(
      adminConnection,
      {
        body: {
          page: 999,
          limit: 10,
        } satisfies IRedditPlatformCommunityAnalytic.IRequest,
      },
    );
  typia.assert(pageBeyond);
  TestValidator.equals(
    "page beyond returns empty data",
    pageBeyond.data.length,
    0,
  );
  // 6. Maximum limit value (100)
  const maxLimit =
    await api.functional.redditPlatform.admin.analytics.communities.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IRedditPlatformCommunityAnalytic.IRequest,
      },
    );
  typia.assert(maxLimit);
  TestValidator.equals(
    "limit should be 100 (maximum)",
    maxLimit.pagination.limit,
    100,
  );
  // 7. Minimum limit value (1)
  const minLimit =
    await api.functional.redditPlatform.admin.analytics.communities.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IRedditPlatformCommunityAnalytic.IRequest,
      },
    );
  typia.assert(minLimit);
  TestValidator.equals(
    "limit should be 1 (minimum)",
    minLimit.pagination.limit,
    1,
  );
  // 8. Single-day date range filtering (startDate equal to endDate)
  const singleDay = new Date().toISOString();
  const singleDayFilter =
    await api.functional.redditPlatform.admin.analytics.communities.index(
      adminConnection,
      {
        body: {
          startDate: singleDay,
          endDate: singleDay,
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformCommunityAnalytic.IRequest,
      },
    );
  typia.assert(singleDayFilter);
  // 9. Date range with no matching reports
  const noReportsDateRange =
    await api.functional.redditPlatform.admin.analytics.communities.index(
      adminConnection,
      {
        body: {
          startDate: new Date("2020-01-01T00:00:00Z").toISOString(),
          endDate: new Date("2020-01-01T23:59:59Z").toISOString(),
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformCommunityAnalytic.IRequest,
      },
    );
  typia.assert(noReportsDateRange);
  // 10. Verify response structure maintains proper fields even with empty data
  TestValidator.predicate(
    "empty response has valid pagination structure",
    () =>
      noReportsDateRange.pagination.current !== undefined &&
      noReportsDateRange.pagination.limit !== undefined &&
      noReportsDateRange.pagination.records !== undefined &&
      noReportsDateRange.pagination.pages !== undefined,
  );
}
