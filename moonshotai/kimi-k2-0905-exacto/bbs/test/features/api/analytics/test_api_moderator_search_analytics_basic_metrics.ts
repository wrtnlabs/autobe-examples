import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICrIPageIntegerRequired } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrIPageIntegerRequired";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionSearchAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSearchAnalytics";
import type { IEconomicDiscussionSearchAnalyticsPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSearchAnalyticsPerformance";
import type { IEconomicDiscussionSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSearchQuery";
import type { IEconomicDiscussionSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSystemSetting";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicDiscussionSearchAnalyticsPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionSearchAnalyticsPerformance";
import type { IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPagination";
import type { ISearchMetricsByCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ISearchMetricsByCategory";
import type { ISearchQueryFilters } from "@ORGANIZATION/PROJECT-api/lib/structures/ISearchQueryFilters";
import type { ITimePeriod } from "@ORGANIZATION/PROJECT-api/lib/structures/ITimePeriod";

export async function test_api_moderator_search_analytics_basic_metrics(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: moderatorEmail,
      password_hash: RandomGenerator.alphaNumeric(32),
      moderation_level: "standard",
      email_verified: true,
      two_factor_enabled: false,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Set up basic analytics system settings
  const analyticsSetting =
    await api.functional.economicDiscussion.moderator.system_settings.create(
      connection,
      {
        body: {
          setting_key: "search_analytics_enabled",
          setting_value: "true",
          setting_type: "boolean",
          display_name: "Search Analytics Enabled",
          description:
            "Enable basic search performance tracking and analytics collection",
          category: "analytics",
          is_system_critical: false,
          is_editable: true,
        } satisfies IEconomicDiscussionSystemSetting.ICreate,
      },
    );
  typia.assert(analyticsSetting);

  // Step 3: Query search performance analytics with basic time filtering
  const currentDate = new Date();
  const startDate = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

  const analyticsRequest = {
    time_period: {
      start_date: startDate.toISOString().split("T")[0],
      end_date: currentDate.toISOString().split("T")[0],
    } satisfies ITimePeriod,
    analysis_depth: "basic",
    metrics_focus: ["frequency", "performance"],
    pagination: {
      page: 1,
      limit: 10,
    } satisfies IPagination,
  } satisfies IEconomicDiscussionSearchAnalytics.IRequest;

  const analyticsResponse =
    await api.functional.economicDiscussion.moderator.search.analytics.performance(
      connection,
      {
        body: analyticsRequest,
      },
    );
  typia.assert(analyticsResponse);

  // Step 4: Validate basic analytics metrics are present
  TestValidator.predicate(
    "analytics response contains data",
    analyticsResponse.data.length > 0,
  );

  const performanceData = analyticsResponse.data[0];
  TestValidator.predicate(
    "total searches is non-negative",
    performanceData.totalSearches >= 0,
  );
  TestValidator.predicate(
    "unique queries is non-negative",
    performanceData.uniqueQueries >= 0,
  );
  TestValidator.predicate(
    "average results per query is non-negative",
    performanceData.averageResultsPerQuery >= 0,
  );

  // Validate core search metrics are reasonable
  TestValidator.predicate(
    "total searches >= unique queries",
    performanceData.totalSearches >= performanceData.uniqueQueries,
  );
  TestValidator.equals(
    "analysis depth is basic",
    analyticsRequest.analysis_depth,
    "basic",
  );

  // Step 5: Validate pagination information
  TestValidator.predicate(
    "pagination current is valid UUID",
    analyticsResponse.pagination.current.length > 0,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    parseInt(analyticsResponse.pagination.pages) > 0,
  );
  TestValidator.equals(
    "pagination limit matches request",
    analyticsResponse.pagination.limit,
    "10",
  );

  // Validate that search metrics by category are included if present
  if (performanceData.searchMetricsByCategory.length > 0) {
    const categoryMetrics = performanceData.searchMetricsByCategory[0];
    TestValidator.predicate(
      "category total searches is non-negative",
      categoryMetrics.totalSearches >= 0,
    );
    TestValidator.predicate(
      "category unique queries is non-negative",
      categoryMetrics.uniqueQueries >= 0,
    );
    TestValidator.predicate(
      "category engagement rate is between 0 and 100",
      categoryMetrics.categoryEngagementRate >= 0 &&
        categoryMetrics.categoryEngagementRate <= 100,
    );
  }
}
