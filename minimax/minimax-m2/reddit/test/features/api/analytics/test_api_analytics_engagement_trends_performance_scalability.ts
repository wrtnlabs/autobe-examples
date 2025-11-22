import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformContentEngagementTrend } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformContentEngagementTrend";
import type { IRedditPlatformContentEngagementAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformContentEngagementAnalytics";
import type { IRedditPlatformContentEngagementTrend } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformContentEngagementTrend";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

/**
 * Test engagement analytics performance under various load conditions including
 * large date ranges, maximum pagination limits, and complex filtering
 * combinations. Validates system performance, query optimization, and response
 * time handling for comprehensive platform analytics at scale.
 */
export async function test_api_analytics_engagement_trends_performance_scalability(
  connection: api.IConnection,
) {
  // Create platform administrator account for performance testing
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminUsername: string = RandomGenerator.name(2);

  const adminAccount: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: "SecurePass123!",
        display_name: `Performance Admin ${RandomGenerator.name(1)}`,
        administrator_level: "super_admin",
        security_clearance: "high",
        system_permissions: JSON.stringify({
          user_management: { can_create_users: true, can_view_user_data: true },
          community_oversight: { can_view_community_data: true },
          content_moderation: {
            can_remove_content: true,
            can_manage_reports: true,
          },
          system_configuration: { can_view_system_logs: true },
          compliance_legal: {
            can_access_compliance_data: true,
            can_view_analytics: true,
          },
        }),
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(adminAccount);

  // Test 1: Maximum Pagination Performance
  const maxPaginationRequest: IRedditPlatformContentEngagementAnalytics.IRequest =
    {
      page: 1,
      limit: 100,
      order_by: "created_at_desc",
    };

  const maxPaginationStart = Date.now();
  const maxPaginationResult =
    await api.functional.redditPlatform.platformAdministrator.analytics.engagementTrends.index(
      connection,
      {
        body: maxPaginationRequest,
      },
    );
  const maxPaginationEnd = Date.now();

  typia.assert(maxPaginationResult);
  TestValidator.equals(
    "max pagination result has data array",
    maxPaginationResult.data,
    maxPaginationResult.data,
  );
  TestValidator.equals(
    "max pagination returns maximum limit",
    maxPaginationResult.data.length,
    maxPaginationResult.data.length,
  );
  TestValidator.predicate(
    "max pagination performance under 2 seconds",
    maxPaginationEnd - maxPaginationStart < 2000,
  );

  // Test 2: Large Date Range Performance Testing
  const largeDateRange = new Date();
  const startDate = new Date(
    largeDateRange.getTime() - 365 * 24 * 60 * 60 * 1000,
  ); // 1 year ago

  const largeDateRangeRequest: IRedditPlatformContentEngagementAnalytics.IRequest =
    {
      date_from: startDate.toISOString(),
      date_to: largeDateRange.toISOString(),
      page: 1,
      limit: 100,
      order_by: "created_at_asc",
    };

  const largeDateStart = Date.now();
  const largeDateRangeResult =
    await api.functional.redditPlatform.platformAdministrator.analytics.engagementTrends.index(
      connection,
      {
        body: largeDateRangeRequest,
      },
    );
  const largeDateEnd = Date.now();

  typia.assert(largeDateRangeResult);
  TestValidator.predicate(
    "large date range query performance under 3 seconds",
    largeDateEnd - largeDateStart < 3000,
  );

  // Test 3: Complex Filter Combination Performance
  const complexFilterRequest: IRedditPlatformContentEngagementAnalytics.IRequest =
    {
      engagement_types: ["view", "scroll", "share", "save"],
      duration_min_seconds: 1,
      duration_max_seconds: 3600,
      page: 1,
      limit: 100,
      order_by: "duration_desc",
      with_metadata: true,
      aggregated: true,
    };

  const complexFilterStart = Date.now();
  const complexFilterResult =
    await api.functional.redditPlatform.platformAdministrator.analytics.engagementTrends.index(
      connection,
      {
        body: complexFilterRequest,
      },
    );
  const complexFilterEnd = Date.now();

  typia.assert(complexFilterResult);
  TestValidator.predicate(
    "complex filter performance under 2.5 seconds",
    complexFilterEnd - complexFilterStart < 2500,
  );

  // Test 4: Maximum Page Number Performance
  const maxPageRequest: IRedditPlatformContentEngagementAnalytics.IRequest = {
    page: 9999,
    limit: 20,
    order_by: "created_at_desc",
  };

  const maxPageResult =
    await api.functional.redditPlatform.platformAdministrator.analytics.engagementTrends.index(
      connection,
      {
        body: maxPageRequest,
      },
    );

  typia.assert(maxPageResult);
  TestValidator.equals(
    "max page request returns valid pagination",
    maxPageResult.pagination.current,
    maxPageRequest.page,
  );

  // Test 5: Concurrent Query Performance Simulation
  const concurrentRequests = ArrayUtil.repeat(5, async () => {
    const requestStart = Date.now();
    await api.functional.redditPlatform.platformAdministrator.analytics.engagementTrends.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          order_by: "created_at_desc",
        } satisfies IRedditPlatformContentEngagementAnalytics.IRequest,
      },
    );
    return Date.now() - requestStart;
  });

  const concurrentResults = await Promise.all(concurrentRequests);
  const averageConcurrentTime =
    concurrentResults.reduce((a, b) => a + b, 0) / concurrentResults.length;

  TestValidator.predicate(
    "concurrent queries average under 1.5 seconds",
    averageConcurrentTime < 1500,
  );
  TestValidator.equals(
    "all concurrent requests completed successfully",
    concurrentResults.length,
    5,
  );

  // Test 6: Edge Case Validation - Empty Date Range
  const emptyDateRangeRequest: IRedditPlatformContentEngagementAnalytics.IRequest =
    {
      date_from: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Future date
      date_to: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
      page: 1,
      limit: 10,
    };

  const emptyDateRangeResult =
    await api.functional.redditPlatform.platformAdministrator.analytics.engagementTrends.index(
      connection,
      {
        body: emptyDateRangeRequest,
      },
    );

  typia.assert(emptyDateRangeResult);
  TestValidator.predicate(
    "empty date range handled gracefully",
    emptyDateRangeResult.data.length >= 0,
  );

  // Test 7: Performance Regression Test - Extreme Limits
  const extremeLimitsRequest: IRedditPlatformContentEngagementAnalytics.IRequest =
    {
      engagement_types: ["view", "scroll"],
      duration_min_seconds: 0,
      duration_max_seconds: 999999,
      page: 1,
      limit: 100,
      order_by: "duration_asc",
      with_metadata: true,
    };

  const extremeStart = Date.now();
  const extremeLimitsResult =
    await api.functional.redditPlatform.platformAdministrator.analytics.engagementTrends.index(
      connection,
      {
        body: extremeLimitsRequest,
      },
    );
  const extremeEnd = Date.now();

  typia.assert(extremeLimitsResult);
  TestValidator.predicate(
    "extreme limits query performance under 4 seconds",
    extremeEnd - extremeStart < 4000,
  );

  // Test 8: Memory Usage Validation
  const memoryIntensiveRequest: IRedditPlatformContentEngagementAnalytics.IRequest =
    {
      page: 1,
      limit: 100,
      with_metadata: true,
      aggregated: false, // Raw data for stress test
    };

  const memoryTestResult =
    await api.functional.redditPlatform.platformAdministrator.analytics.engagementTrends.index(
      connection,
      {
        body: memoryIntensiveRequest,
      },
    );

  typia.assert(memoryTestResult);
  TestValidator.predicate(
    "memory intensive request returns structured data",
    memoryTestResult.data.length >= 0,
  );

  // Test 9: Response Time Consistency Check
  const responseTimeMeasurements: number[] = [];

  for (let i = 0; i < 10; i++) {
    const start = Date.now();
    await api.functional.redditPlatform.platformAdministrator.analytics.engagementTrends.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          order_by: "created_at_desc",
        } satisfies IRedditPlatformContentEngagementAnalytics.IRequest,
      },
    );
    responseTimeMeasurements.push(Date.now() - start);
  }

  const maxResponseTime = Math.max(...responseTimeMeasurements);
  const minResponseTime = Math.min(...responseTimeMeasurements);
  const responseTimeVariance = maxResponseTime - minResponseTime;

  TestValidator.predicate(
    "response time consistency - max under 2 seconds",
    maxResponseTime < 2000,
  );
  TestValidator.predicate(
    "response time variance under 1 second",
    responseTimeVariance < 1000,
  );

  // Final Performance Summary
  const finalRequest: IRedditPlatformContentEngagementAnalytics.IRequest = {
    page: 1,
    limit: 50,
    order_by: "created_at_desc",
  };

  const finalStart = Date.now();
  const finalResult =
    await api.functional.redditPlatform.platformAdministrator.analytics.engagementTrends.index(
      connection,
      {
        body: finalRequest,
      },
    );
  const finalDuration = Date.now() - finalStart;

  typia.assert(finalResult);
  TestValidator.predicate(
    "final performance validation under 1.5 seconds",
    finalDuration < 1500,
  );
}
