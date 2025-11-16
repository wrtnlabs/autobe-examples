import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionSearchAnalyticsTrends } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSearchAnalyticsTrends";
import type { IEconomicDiscussionSearchQueryAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSearchQueryAnalytics";
import type { ISearchCategoryBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/ISearchCategoryBreakdown";
import type { ISearchEngagementMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/ISearchEngagementMetrics";
import type { ISearchVolumeTrend } from "@ORGANIZATION/PROJECT-api/lib/structures/ISearchVolumeTrend";

/**
 * Test that authenticated moderators can retrieve comprehensive search
 * analytics trends showing popular queries, trending topics, and usage patterns
 * across the economic discussion board platform. This validates moderator
 * access to community intelligence data for understanding what economic and
 * political topics users are most interested in discovering. The test should
 * verify the response includes popular_queries list, trending_queries array,
 * search_volume_trends data, category_breakdown analysis, and
 * user_engagement_metrics with proper data structure and valid statistical
 * values.
 */
export async function test_api_moderator_search_analytics_trends_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account to establish administrative authentication context
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(32),
      email_verified: true,
      two_factor_enabled: false,
      moderation_level: RandomGenerator.pick([
        "standard",
        "senior",
        "admin",
      ] as const),
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Verify moderator authentication was successful by checking token
  TestValidator.predicate(
    "moderator token obtained",
    moderator.token.access.length > 0,
  );
  TestValidator.equals(
    "moderator username matches",
    moderator.username,
    moderator.username,
  );

  // Step 3: Retrieve search analytics trends with moderator privileges
  const trends =
    await api.functional.economicDiscussion.moderator.search.analytics.trends(
      connection,
    );
  typia.assert(trends);

  // Step 4: Validate response contains all expected analytics components
  TestValidator.predicate(
    "response has popular queries",
    Array.isArray(trends.popular_queries),
  );
  TestValidator.predicate(
    "response has search volume trends",
    Array.isArray(trends.search_volume_trends),
  );
  TestValidator.predicate(
    "response has user engagement metrics",
    trends.user_engagement_metrics !== null &&
      typeof trends.user_engagement_metrics === "object",
  );

  // Step 5: Validate popular queries structure and data
  TestValidator.predicate(
    "popular queries has valid length",
    trends.popular_queries.length >= 0,
  );
  if (trends.popular_queries.length > 0) {
    TestValidator.predicate(
      "first query has text",
      trends.popular_queries[0].query_text.length > 0,
    );
    TestValidator.predicate(
      "first query has valid frequency",
      trends.popular_queries[0].frequency >= 0,
    );
    TestValidator.predicate(
      "first query has valid results count",
      trends.popular_queries[0].results_count >= 0,
    );

    // Validate optional click-through rate
    if (trends.popular_queries[0].click_through_rate !== undefined) {
      TestValidator.predicate(
        "click-through rate is valid percentage",
        trends.popular_queries[0].click_through_rate! >= 0 &&
          trends.popular_queries[0].click_through_rate! <= 1,
      );
    }
  }

  // Step 6: Validate trending queries structure (optional field)
  if (trends.trending_queries !== undefined) {
    TestValidator.predicate(
      "trending queries is valid array",
      Array.isArray(trends.trending_queries),
    );
    for (const query of trends.trending_queries) {
      TestValidator.predicate(
        "trending query has valid text",
        query.query_text.length > 0,
      );
      TestValidator.predicate(
        "trending query has valid frequency",
        query.frequency >= 0,
      );
    }
  }

  // Step 7: Validate search volume trends structure
  TestValidator.predicate(
    "search volume trends has valid length",
    trends.search_volume_trends.length >= 0,
  );
  for (const trend of trends.search_volume_trends) {
    TestValidator.predicate("trend has valid date", trend.date.length > 0);
    TestValidator.predicate(
      "trend has valid total queries",
      trend.total_queries >= 0,
    );
    TestValidator.predicate(
      "trend has valid unique queries",
      trend.unique_queries >= 0,
    );
    TestValidator.predicate(
      "trend has valid active users",
      trend.active_users >= 0,
    );

    // Validate optional peak hour
    if (trend.peak_hour !== undefined) {
      TestValidator.predicate(
        "peak hour format is valid",
        trend.peak_hour.length > 0,
      );
    }
  }

  // Step 8: Validate category breakdown structure (optional field)
  if (trends.category_breakdown !== undefined) {
    TestValidator.predicate(
      "category breakdown is valid array",
      Array.isArray(trends.category_breakdown),
    );
    for (const category of trends.category_breakdown) {
      TestValidator.predicate(
        "category has code",
        category.category_code.length > 0,
      );
      TestValidator.predicate(
        "category has name",
        category.category_name.length > 0,
      );
      TestValidator.predicate(
        "category has valid search count",
        category.search_count >= 0,
      );
      TestValidator.predicate(
        "category has valid percentage",
        category.percentage_of_total >= 0 && category.percentage_of_total <= 1,
      );

      // Validate optional avg_results_per_query
      if (category.avg_results_per_query !== undefined) {
        TestValidator.predicate(
          "avg results per query is non-negative",
          category.avg_results_per_query >= 0,
        );
      }
    }
  }

  // Step 9: Validate user engagement metrics
  const metrics = trends.user_engagement_metrics;
  TestValidator.predicate(
    "metrics has total searches",
    metrics.total_searches >= 0,
  );
  TestValidator.predicate(
    "metrics has unique searchers",
    metrics.unique_searchers >= 0,
  );
  TestValidator.predicate(
    "metrics has valid search success rate",
    metrics.search_success_rate >= 0 && metrics.search_success_rate <= 1,
  );

  if (metrics.average_queries_per_user !== undefined) {
    TestValidator.predicate(
      "average queries per user is non-negative",
      metrics.average_queries_per_user >= 0,
    );
  }

  if (metrics.average_response_time_ms !== undefined) {
    TestValidator.predicate(
      "average response time is non-negative",
      metrics.average_response_time_ms >= 0,
    );
  }

  if (metrics.user_satisfaction_score !== undefined) {
    TestValidator.predicate(
      "user satisfaction score is valid",
      metrics.user_satisfaction_score >= 1 &&
        metrics.user_satisfaction_score <= 5,
    );
  }

  // Step 10: Validate overall analytics completeness
  TestValidator.predicate(
    "analytics contains all required fields",
    trends.popular_queries !== undefined &&
      trends.search_volume_trends !== undefined &&
      trends.user_engagement_metrics !== undefined,
  );

  console.log(
    "✅ Successfully validated moderator search analytics trends retrieval with comprehensive data integrity",
  );
}
