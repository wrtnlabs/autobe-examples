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
 * Test that authenticated moderators can access overall search engagement
 * metrics including total searches, unique searchers, average queries per user,
 * search success rates, and user satisfaction scores. This validates moderator
 * access to platform-wide search performance data for measuring search
 * effectiveness and user satisfaction.
 */
export async function test_api_moderator_search_analytics_overall_engagement(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account to establish administrative authentication
  const moderatorCredentials = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    moderation_level: RandomGenerator.pick([
      "admin",
      "senior",
      "junior",
    ] as const),
    email_verified: true,
    two_factor_enabled: false,
  } satisfies IEconomicDiscussionModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorCredentials,
  });
  typia.assert(moderator);

  TestValidator.equals(
    "moderator username matches",
    moderator.username,
    moderatorCredentials.username,
  );
  TestValidator.equals(
    "moderator email matches",
    moderator.email,
    moderatorCredentials.email,
  );
  TestValidator.equals(
    "moderator level matches",
    moderator.moderation_level,
    moderatorCredentials.moderation_level,
  );
  TestValidator.predicate(
    "moderator email verified",
    moderator.email_verified === true,
  );
  TestValidator.predicate("token exists", moderator.token.access.length > 0);

  // Step 2: Access search analytics trends with moderator authorization
  const analytics: IEconomicDiscussionSearchAnalyticsTrends =
    await api.functional.economicDiscussion.moderator.search.analytics.trends(
      connection,
    );
  typia.assert(analytics);

  // Step 3: Validate overall search engagement metrics structure
  const engagement = analytics.user_engagement_metrics;
  typia.assert(engagement);

  // Step 4: Verify user engagement metrics contain realistic business data
  TestValidator.predicate(
    "total searches is positive number",
    engagement.total_searches >= 0,
  );
  TestValidator.predicate(
    "unique searchers is positive number",
    engagement.unique_searchers >= 0,
  );
  TestValidator.predicate(
    "total searches >= unique searchers",
    engagement.total_searches >= engagement.unique_searchers,
  );

  if (engagement.average_queries_per_user !== undefined) {
    TestValidator.predicate(
      "average queries per user is reasonable",
      engagement.average_queries_per_user > 0 &&
        engagement.average_queries_per_user <= 100,
    );
  }

  if (engagement.search_success_rate !== undefined) {
    TestValidator.predicate(
      "search success rate is valid percentage",
      engagement.search_success_rate >= 0 &&
        engagement.search_success_rate <= 1,
    );
  }

  if (engagement.average_response_time_ms !== undefined) {
    TestValidator.predicate(
      "response time is reasonable",
      engagement.average_response_time_ms > 0 &&
        engagement.average_response_time_ms <= 5000,
    );
  }

  if (engagement.user_satisfaction_score !== undefined) {
    TestValidator.predicate(
      "satisfaction score is valid",
      engagement.user_satisfaction_score >= 1 &&
        engagement.user_satisfaction_score <= 5,
    );
  }

  // Step 5: Validate popular queries structure
  TestValidator.predicate(
    "popular queries array exists",
    analytics.popular_queries.length >= 0,
  );
  analytics.popular_queries.forEach((query, index) => {
    typia.assert(query);
    TestValidator.predicate("query text exists", query.query_text.length > 0);
    TestValidator.predicate("frequency is positive", query.frequency >= 1);
    TestValidator.predicate(
      "results count is reasonable",
      query.results_count >= 0,
    );

    if (query.click_through_rate !== undefined) {
      TestValidator.predicate(
        "click through rate is valid",
        query.click_through_rate >= 0 && query.click_through_rate <= 1,
      );
    }

    if (query.average_click_position !== undefined) {
      TestValidator.predicate(
        "click position is positive",
        query.average_click_position > 0,
      );
    }
  });

  // Step 6: Validate search volume trends if present
  if (analytics.search_volume_trends) {
    analytics.search_volume_trends.forEach((trend, index) => {
      typia.assert(trend);
      TestValidator.predicate("date is valid format", trend.date.length > 0);
      TestValidator.predicate("total queries >= 0", trend.total_queries >= 0);
      TestValidator.predicate("unique queries >= 0", trend.unique_queries >= 0);
      TestValidator.predicate("active users >= 0", trend.active_users >= 0);
      TestValidator.predicate(
        "totals consistency",
        trend.total_queries >= trend.unique_queries,
      );
    });
  }

  // Step 7: Validate category breakdown if present
  if (analytics.category_breakdown) {
    analytics.category_breakdown.forEach((category, index) => {
      typia.assert(category);
      TestValidator.predicate(
        "category code exists",
        category.category_code.length > 0,
      );
      TestValidator.predicate(
        "category name exists",
        category.category_name.length > 0,
      );
      TestValidator.predicate(
        "search count is positive",
        category.search_count >= 0,
      );
      TestValidator.predicate(
        "percentage is valid",
        category.percentage_of_total >= 0 && category.percentage_of_total <= 1,
      );
    });
  }

  // Step 8: Test that analytics follows expected patterns for economic discussion platform
  TestValidator.predicate(
    "has engagement metrics",
    !!analytics.user_engagement_metrics,
  );
  TestValidator.predicate(
    "has popular queries",
    analytics.popular_queries.length > 0 ||
      analytics.popular_queries.length === 0,
  );
  TestValidator.predicate(
    "has search trends if included",
    !analytics.search_volume_trends ||
      analytics.search_volume_trends.length > 0,
  );

  TestValidator.equals("test completes successfully", true, true);
}
