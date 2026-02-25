import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformVoteKarmaImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteKarmaImpact";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVoteKarmaImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteKarmaImpact";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_voting_performance_analytics_time_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Update admin connection with authorization token
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: adminAuth.token.access,
  };
  // Test 1: Last 24 hours with hourly granularity
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const hourlyResponse =
    await api.functional.communityPlatform.admin.analytics.voting_performance.index(
      adminConnection,
      {
        body: {
          start_time: yesterday.toISOString(),
          end_time: now.toISOString(),
          granularity: "hour",
          metric_categories: [
            "transaction_times",
            "vote_rates",
            "karma_calculation",
            "error_rates",
            "resource_utilization",
          ],
          page: null,
          limit: null,
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(hourlyResponse);
  // Test 2: Last week with daily granularity
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dailyResponse =
    await api.functional.communityPlatform.admin.analytics.voting_performance.index(
      adminConnection,
      {
        body: {
          start_time: lastWeek.toISOString(),
          end_time: now.toISOString(),
          granularity: "day",
          metric_categories: ["vote_rates", "error_rates"],
          page: null,
          limit: null,
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(dailyResponse);
  // Test 3: Custom date range with weekly granularity
  const customStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const customEnd = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
  const weeklyResponse =
    await api.functional.communityPlatform.admin.analytics.voting_performance.index(
      adminConnection,
      {
        body: {
          start_time: customStart.toISOString(),
          end_time: customEnd.toISOString(),
          granularity: "week",
          metric_categories: ["karma_calculation", "resource_utilization"],
          page: null,
          limit: null,
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(weeklyResponse);
  // Test 4: Edge case - overlapping periods (same start and end time)
  const sameTimeResponse =
    await api.functional.communityPlatform.admin.analytics.voting_performance.index(
      adminConnection,
      {
        body: {
          start_time: now.toISOString(),
          end_time: now.toISOString(),
          granularity: "hour",
          metric_categories: [],
          page: null,
          limit: null,
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(sameTimeResponse);
  // Test 5: Edge case - future dates
  const futureStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const futureEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const futureResponse =
    await api.functional.communityPlatform.admin.analytics.voting_performance.index(
      adminConnection,
      {
        body: {
          start_time: futureStart.toISOString(),
          end_time: futureEnd.toISOString(),
          granularity: "day",
          metric_categories: ["transaction_times"],
          page: null,
          limit: null,
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(futureResponse);
  // Test 6: Pagination test
  const paginatedResponse =
    await api.functional.communityPlatform.admin.analytics.voting_performance.index(
      adminConnection,
      {
        body: {
          start_time: yesterday.toISOString(),
          end_time: now.toISOString(),
          granularity: "hour",
          metric_categories: [],
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  // Validate pagination structure
  TestValidator.equals(
    "page limit matches",
    paginatedResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page current matches",
    paginatedResponse.pagination.current,
    1,
  );
  // Test 7: Empty metric categories (should return all metrics)
  const emptyCategoriesResponse =
    await api.functional.communityPlatform.admin.analytics.voting_performance.index(
      adminConnection,
      {
        body: {
          start_time: yesterday.toISOString(),
          end_time: now.toISOString(),
          granularity: "hour",
          metric_categories: undefined,
          page: null,
          limit: null,
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(emptyCategoriesResponse);
  // Test 8: Invalid time range (end before start)
  await TestValidator.error("invalid time range should fail", async () => {
    await api.functional.communityPlatform.admin.analytics.voting_performance.index(
      adminConnection,
      {
        body: {
          start_time: now.toISOString(),
          end_time: yesterday.toISOString(), // end before start
          granularity: "hour",
          metric_categories: [],
          page: null,
          limit: null,
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  });
  // Validate that all responses contain valid period data
  const allResponses = [
    hourlyResponse,
    dailyResponse,
    weeklyResponse,
    sameTimeResponse,
    futureResponse,
    paginatedResponse,
    emptyCategoriesResponse,
  ];
  for (const response of allResponses) {
    for (const item of response.data) {
      // Validate that period_start is before period_end
      const startDate = new Date(item.period_start);
      const endDate = new Date(item.period_end);
      TestValidator.predicate(
        "period_start is before period_end",
        startDate <= endDate,
      );
      // Validate period type matches expected values
      TestValidator.predicate(
        "valid period_type",
        ["hourly", "daily", "weekly", "monthly"].includes(item.period_type),
      );
    }
  }
}
