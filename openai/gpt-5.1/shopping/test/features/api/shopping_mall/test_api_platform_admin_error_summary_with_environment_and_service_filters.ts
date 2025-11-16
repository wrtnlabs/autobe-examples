import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAnalyticsTimeBucketOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsTimeBucketOption";
import type { IShoppingMallAnalyticsTimeRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsTimeRange";
import type { IShoppingMallErrorSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallErrorSummary";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that platform admin error summary respects environment and service
 * filters.
 *
 * Business context: Platform operators need to slice error analytics by
 * environment (e.g., production vs staging) and by service (e.g.,
 * orders-service, payments-service). This test exercises the errorSummary
 * analytics endpoint to ensure that, when filters are provided, the aggregated
 * buckets and totals are at least structurally consistent with those filters.
 *
 * Test flow:
 *
 * 1. Register a platform admin using POST /auth/platformAdmin/join so that
 *    subsequent calls run under a valid platform admin session. We rely on the
 *    SDK to attach the JWT token to the provided connection instance.
 * 2. Build a request body satisfying IShoppingMallErrorSummary.IRequest:
 *
 *    - TimeRange: from 30 minutes ago to now (ISO 8601 date-time strings).
 *    - RoutePrefixes: explicitly null to indicate no route filtering.
 *    - Services: ["orders-service"].
 *    - SeverityLevels: null.
 *    - ErrorCategories: null.
 *    - Environments: ["production"].
 *    - TimeBucket: "hour".
 * 3. Call PATCH /shoppingMall/platformAdmin/analytics/logging/errorSummary via
 *    api.functional.shoppingMall.platformAdmin.analytics.logging.errorSummary.index.
 * 4. Validate:
 *
 *    - Response is a valid IShoppingMallErrorSummary via typia.assert.
 *    - TotalErrorCount is >= 0.
 *    - UniqueErrorSignatures is >= 0.
 *    - ErrorRatePerMinute is >= 0.
 *    - From and to parse as valid dates and from <= to.
 *    - For every bucket in buckets:
 *
 *         - ErrorCount >= 0 and errorRate >= 0.
 *         - If bucket.service is defined, it must equal "orders-service" because of the
 *                   filter.
 *    - If there is at least one bucket, ensure at least one bucket has errorCount >=
 *         0 (trivial but asserts non-negative counts on real data) and that
 *         time window boundaries, when present, fall within or equal to the
 *         requested timeRange.
 *
 * Notes:
 *
 * - We cannot control or seed shopping_mall_error_logs from this test, so we
 *   avoid asserting exact counts and instead focus on structural correctness
 *   and filter consistency where observable.
 * - We must not manipulate connection.headers manually; authentication is managed
 *   by the join API function.
 * - All deep type validation is delegated to typia.assert, and additional
 *   TestValidator checks focus on business semantics rather than schema
 *   structure.
 */
export async function test_api_platform_admin_error_summary_with_environment_and_service_filters(
  connection: api.IConnection,
) {
  // 1. Register a platform admin to obtain an authorized session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Build error summary request with environment and service filters
  const now = new Date();
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

  const timeRange: IShoppingMallAnalyticsTimeRange = {
    start: thirtyMinutesAgo.toISOString(),
    end: now.toISOString(),
  };

  const requestBody = {
    timeRange,
    routePrefixes: null,
    services: ["orders-service"],
    severityLevels: null,
    errorCategories: null,
    environments: ["production"],
    timeBucket: "hour" as IShoppingMallAnalyticsTimeBucketOption,
  } satisfies IShoppingMallErrorSummary.IRequest;

  // 3. Call the error summary analytics endpoint
  const summary: IShoppingMallErrorSummary =
    await api.functional.shoppingMall.platformAdmin.analytics.logging.errorSummary.index(
      connection,
      { body: requestBody },
    );
  typia.assert<IShoppingMallErrorSummary>(summary);

  // 4. Basic numeric and temporal sanity checks
  TestValidator.predicate(
    "total error count is non-negative",
    () => summary.totalErrorCount >= 0,
  );
  TestValidator.predicate(
    "unique error signatures is non-negative",
    () => summary.uniqueErrorSignatures >= 0,
  );
  TestValidator.predicate(
    "error rate per minute is non-negative",
    () => summary.errorRatePerMinute >= 0,
  );

  // Validate that from/to form a coherent interval and overlap the requested range
  const requestedStart = new Date(timeRange.start).getTime();
  const requestedEnd = new Date(timeRange.end).getTime();
  const actualFrom = new Date(summary.from).getTime();
  const actualTo = new Date(summary.to).getTime();

  TestValidator.predicate(
    "summary.from and summary.to form a non-decreasing interval",
    () => actualFrom <= actualTo,
  );
  TestValidator.predicate(
    "summary interval overlaps requested range",
    () => actualTo >= requestedStart && actualFrom <= requestedEnd,
  );

  // 5. Bucket-level checks: non-negative counts and service filter consistency
  const buckets = summary.buckets;

  TestValidator.predicate("all bucket error counts are non-negative", () =>
    buckets.every((b) => b.errorCount >= 0),
  );
  TestValidator.predicate("all bucket error rates are non-negative", () =>
    buckets.every((b) => b.errorRate >= 0),
  );

  // When bucket.service is present, it must match the service filter
  TestValidator.predicate(
    "all buckets with a service field respect the orders-service filter",
    () =>
      buckets.every(
        (b) => b.service === undefined || b.service === "orders-service",
      ),
  );

  // If there are buckets with time windows, ensure they lie within the requested interval
  if (buckets.length > 0) {
    const bucketsWithTimeWindows = buckets.filter(
      (b) => b.timeWindowStart !== undefined && b.timeWindowEnd !== undefined,
    );

    if (bucketsWithTimeWindows.length > 0) {
      TestValidator.predicate(
        "bucket time windows are within the requested range",
        () =>
          bucketsWithTimeWindows.every((b) => {
            const startMs = new Date(b.timeWindowStart!).getTime();
            const endMs = new Date(b.timeWindowEnd!).getTime();
            return (
              startMs >= requestedStart &&
              endMs <= requestedEnd &&
              startMs <= endMs
            );
          }),
      );
    }
  }
}
