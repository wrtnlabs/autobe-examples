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

export async function test_api_admin_community_analytics_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: `admin_${typia.random<string & tags.Format<"uuid">>()}@test.com`,
      username: RandomGenerator.alphaNumeric(16),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>() ?? null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>() ?? null,
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // adminConnection.headers is now updated with token
  // 2. Test date range filtering
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const dateFilteredResult =
    await api.functional.redditPlatform.admin.analytics.communities.index(
      adminConnection,
      {
        body: {
          startDate: twoDaysAgo.toISOString(),
          endDate: threeDaysFromNow.toISOString(),
        } satisfies IRedditPlatformCommunityAnalytic.IRequest,
      },
    );
  typia.assert(dateFilteredResult);
  // 3. Test subscriber count filtering
  const subscriberCountMinResult =
    await api.functional.redditPlatform.admin.analytics.communities.index(
      adminConnection,
      {
        body: {
          subscriberCountMin: 5,
        } satisfies IRedditPlatformCommunityAnalytic.IRequest,
      },
    );
  typia.assert(subscriberCountMinResult);
  const subscriberCountMaxResult =
    await api.functional.redditPlatform.admin.analytics.communities.index(
      adminConnection,
      {
        body: {
          subscriberCountMax: 10,
        } satisfies IRedditPlatformCommunityAnalytic.IRequest,
      },
    );
  typia.assert(subscriberCountMaxResult);
  // 4. Test pagination - page 1 with limit 10
  const page1Limit10Result =
    await api.functional.redditPlatform.admin.analytics.communities.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformCommunityAnalytic.IRequest,
      },
    );
  typia.assert(page1Limit10Result);
  // 5. Test pagination - page 2 with limit 5
  const page2Limit5Result =
    await api.functional.redditPlatform.admin.analytics.communities.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IRedditPlatformCommunityAnalytic.IRequest,
      },
    );
  typia.assert(page2Limit5Result);
  // 6. Combine multiple filters: date range + subscriber count + pagination
  const combinedResult =
    await api.functional.redditPlatform.admin.analytics.communities.index(
      adminConnection,
      {
        body: {
          startDate: twoDaysAgo.toISOString(),
          endDate: threeDaysFromNow.toISOString(),
          subscriberCountMin: 100,
          subscriberCountMax: 1000,
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformCommunityAnalytic.IRequest,
      },
    );
  typia.assert(combinedResult);
  // 7. Validate pagination structure
  TestValidator.predicate("pagination has valid structure", () => {
    const pagination = combinedResult.pagination;
    return (
      pagination.current >= 1 &&
      pagination.limit >= 1 &&
      pagination.records >= 0 &&
      pagination.pages >= 0
    );
  });
  // 8. Validate page 1 with limit 10
  TestValidator.equals(
    "page 1 is current",
    page1Limit10Result.pagination.current,
    1,
  );
  TestValidator.equals("limit 10", page1Limit10Result.pagination.limit, 10);
  TestValidator.predicate(
    "records count valid",
    page1Limit10Result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count valid",
    page1Limit10Result.pagination.pages >= 0,
  );
  // 9. Validate page 2 with limit 5
  TestValidator.equals(
    "page 2 is current",
    page2Limit5Result.pagination.current,
    2,
  );
  TestValidator.equals("limit 5", page2Limit5Result.pagination.limit, 5);
  // 10. Validate response data structure
  const sampleData = page1Limit10Result.data[0];
  if (sampleData) {
    typia.assert(sampleData);
    // Validate community analytics fields
    TestValidator.predicate(
      "community name is not empty",
      sampleData.community_name.length > 0,
    );
    TestValidator.predicate(
      "total reports is valid",
      sampleData.total_reports >= 0,
    );
    TestValidator.predicate(
      "resolved reports is valid",
      sampleData.resolved_reports >= 0,
    );
    TestValidator.predicate(
      "dismissed reports is valid",
      sampleData.dismissed_reports >= 0,
    );
    TestValidator.predicate(
      "subscriber count is valid",
      sampleData.subscriber_count >= 0,
    );
    // Validate resolution rate if total reports > 0
    if (sampleData.total_reports > 0) {
      TestValidator.predicate(
        "resolution rate is between 0 and 1",
        sampleData.resolution_rate !== null
          ? sampleData.resolution_rate >= 0 && sampleData.resolution_rate <= 1
          : true,
      );
    }
  }
  // 11. Validate data array count matches pagination limit
  TestValidator.equals(
    "data count matches limit on page 1",
    page1Limit10Result.data.length,
    Math.min(10, page1Limit10Result.pagination.records),
  );
  TestValidator.equals(
    "data count matches limit on page 2",
    page2Limit5Result.data.length,
    Math.min(
      5,
      page2Limit5Result.pagination.records > 5
        ? page2Limit5Result.pagination.records - 5
        : 0,
    ),
  );
}
