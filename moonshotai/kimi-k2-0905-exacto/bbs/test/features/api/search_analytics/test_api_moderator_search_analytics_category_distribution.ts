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

export async function test_api_moderator_search_analytics_category_distribution(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
  const moderatorData = {
    username: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    email_verified: true,
    two_factor_enabled: false,
    moderation_level: "full_access",
  } satisfies IEconomicDiscussionModerator.ICreate;

  const moderator: IEconomicDiscussionModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Validate moderator account was created successfully
  TestValidator.equals(
    "moderator email verified",
    moderator.email_verified,
    true,
  );

  // Step 2: Retrieve search analytics trends with category breakdown
  const analytics: IEconomicDiscussionSearchAnalyticsTrends =
    await api.functional.economicDiscussion.moderator.search.analytics.trends(
      connection,
    );
  typia.assert(analytics);

  // Step 3: Validate analytics response structure
  TestValidator.predicate(
    "has popular queries",
    analytics.popular_queries.length > 0,
  );
  TestValidator.predicate(
    "has search volume trends",
    analytics.search_volume_trends.length > 0,
  );
  TestValidator.predicate(
    "has engagement metrics",
    analytics.user_engagement_metrics !== undefined,
  );

  // Step 4: Validate category breakdown structure
  TestValidator.predicate(
    "has category breakdown",
    Array.isArray(analytics.category_breakdown) &&
      analytics.category_breakdown.length > 0,
  );

  const categoryBreakdown = analytics.category_breakdown!;

  // Validate each category breakdown entry
  for (const category of categoryBreakdown) {
    // Business validation - ensure meaningful data
    TestValidator.predicate(
      "category code is non-empty",
      category.category_code.length > 0,
    );
    TestValidator.predicate(
      "category name is non-empty",
      category.category_name.length > 0,
    );
    TestValidator.predicate(
      "search count is non-negative",
      category.search_count >= 0,
    );
    TestValidator.predicate(
      "percentage is in valid range",
      category.percentage_of_total >= 0 && category.percentage_of_total <= 1,
    );

    // Validate optional avg_results_per_query if present
    if (category.avg_results_per_query !== undefined) {
      TestValidator.predicate(
        "avg results is non-negative",
        category.avg_results_per_query >= 0,
      );
    }
  }

  // Step 5: Validate popular queries
  TestValidator.predicate(
    "popular queries exist",
    analytics.popular_queries.length > 0,
  );
  const popularQuery = analytics.popular_queries[0];
  TestValidator.predicate("has query text", popularQuery.query_text.length > 0);
  TestValidator.predicate("has positive frequency", popularQuery.frequency > 0);
  TestValidator.predicate(
    "has non-negative results count",
    popularQuery.results_count >= 0,
  );

  // Step 6: Validate search volume trends
  TestValidator.predicate(
    "search volume trends exist",
    analytics.search_volume_trends.length > 0,
  );
  const trend = analytics.search_volume_trends[0];
  TestValidator.predicate("has date", trend.date.length > 0);
  TestValidator.predicate(
    "has non-negative total queries",
    trend.total_queries >= 0,
  );
  TestValidator.predicate(
    "has non-negative unique queries",
    trend.unique_queries >= 0,
  );
  TestValidator.predicate(
    "has non-negative active users",
    trend.active_users >= 0,
  );

  // Step 7: Validate engagement metrics
  const metrics = analytics.user_engagement_metrics;
  TestValidator.predicate(
    "has non-negative total searches",
    metrics.total_searches >= 0,
  );
  TestValidator.predicate(
    "has unique searchers",
    metrics.unique_searchers >= 0,
  );
  TestValidator.predicate(
    "search success rate is valid",
    metrics.search_success_rate >= 0 && metrics.search_success_rate <= 1,
  );

  // Step 8: Validate that total percentages sum reasonably close to 1.0
  const totalPercentage = categoryBreakdown.reduce(
    (sum, category) => sum + category.percentage_of_total,
    0,
  );
  TestValidator.predicate(
    "percentages sum to approximately 1.0",
    Math.abs(totalPercentage - 1.0) < 0.01, // Allow small rounding variance
  );

  // Step 9: Test search query relationships
  for (const query of analytics.popular_queries) {
    if (query.category_associations !== undefined) {
      TestValidator.predicate(
        "category associations are non-empty",
        query.category_associations.length > 0,
      );
      for (const categoryCode of query.category_associations) {
        TestValidator.predicate(
          "has non-empty category association",
          categoryCode.length > 0,
        );
      }
    }
  }
}
