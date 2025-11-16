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
 * Validate error summary filtering by route prefix and severity level for
 * platform admin.
 *
 * Business purpose: This test ensures that a platform administrator can
 * retrieve aggregated error analytics filtered by specific API route prefixes
 * and severity levels. It verifies that the analytics endpoint respects
 * routePrefixes and severityLevels filters and that the resulting metrics
 * reflect only the filtered subset of error logs.
 *
 * Scenario steps:
 *
 * 1. Register a new platform administrator using POST /auth/platformAdmin/join.
 *    This both creates the admin identity and configures the connection's
 *    Authorization header using the returned IAuthorizationToken.
 * 2. Assume that the environment already has error logs ingested into
 *    shopping_mall_error_logs for multiple routes and severity levels, with at
 *    least one ERROR log for the route prefix "/shoppingMall/orders" within a
 *    recent time window.
 * 3. Build an IShoppingMallErrorSummary.IRequest payload that:
 *
 *    - Sets timeRange to cover the last 24 hours.
 *    - Sets routePrefixes to ["/shoppingMall/orders"].
 *    - Sets severityLevels to ["ERROR"].
 *    - Sets services, errorCategories, and environments to null explicitly.
 *    - Sets timeBucket to "hour".
 * 4. Call PATCH /shoppingMall/platformAdmin/analytics/logging/errorSummary via
 *    api.functional.shoppingMall.platformAdmin.analytics.logging.errorSummary.index.
 * 5. Assert that the response conforms to IShoppingMallErrorSummary via
 *    typia.assert.
 * 6. Perform business-level validations using TestValidator:
 *
 *    - TotalErrorCount must be >= 1, assuming fixtures guarantee at least one
 *         matching ERROR log for the target route prefix.
 *    - There must be at least one bucket with errorCount > 0.
 *    - For all buckets whose route is defined, the route should start with the
 *         requested route prefix "/shoppingMall/orders" so that routePrefixes
 *         filtering is respected.
 *
 * This test does not attempt to validate raw HTTP status codes or type
 * mismatches. It focuses purely on successful, type-safe flows and logical
 * filtering behavior as observed through the aggregated metrics.
 */
export async function test_api_platform_admin_error_summary_with_route_and_severity_filters(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Build a time range covering the last 24 hours.
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const startDate = new Date(now.getTime() - oneDayMs);

  const timeRange = {
    start: startDate.toISOString(),
    end: now.toISOString(),
  } satisfies IShoppingMallAnalyticsTimeRange;

  // 3. Construct the error summary request body with route and severity filters.
  const targetRoutePrefix = "/shoppingMall/orders";

  const requestBody = {
    timeRange,
    routePrefixes: [targetRoutePrefix],
    services: null,
    severityLevels: ["ERROR"],
    errorCategories: null,
    environments: null,
    timeBucket: "hour",
  } satisfies IShoppingMallErrorSummary.IRequest;

  // 4. Call the errorSummary analytics endpoint.
  const summary =
    await api.functional.shoppingMall.platformAdmin.analytics.logging.errorSummary.index(
      connection,
      {
        body: requestBody,
      },
    );

  typia.assert<IShoppingMallErrorSummary>(summary);

  // 5. Business-level validations.

  // Ensure totalErrorCount is at least 1 when fixtures guarantee matching errors.
  TestValidator.predicate(
    "totalErrorCount should be at least 1 for filtered ERROR logs on target route prefix",
    summary.totalErrorCount >= 1,
  );

  // Ensure there is at least one bucket with a positive errorCount.
  const bucketWithErrors = summary.buckets.find(
    (bucket) => bucket.errorCount > 0,
  );
  TestValidator.predicate(
    "at least one bucket should have errorCount > 0",
    !!bucketWithErrors,
  );

  // For every bucket with a defined route, ensure it respects the routePrefixes filter.
  for (const bucket of summary.buckets) {
    if (bucket.route !== undefined) {
      TestValidator.predicate(
        "bucket.route, when defined, must start with the filtered route prefix",
        bucket.route.startsWith(targetRoutePrefix),
      );
    }
  }
}
