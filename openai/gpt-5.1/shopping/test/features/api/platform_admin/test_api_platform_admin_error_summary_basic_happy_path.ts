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
 * Happy-path validation for platform admin error analytics summary endpoint.
 *
 * Business goal: Ensure that a freshly registered platform administrator can
 * successfully retrieve an aggregated error analytics summary over a recent
 * time window using minimal filters, and that the returned metrics satisfy
 * basic non-negativity and temporal consistency rules.
 *
 * Scenario steps:
 *
 * 1. Join as a new platform administrator via POST /auth/platformAdmin/join.
 *
 *    - Provide a realistic IShoppingMallPlatformAdminJoin.IRequest payload (email,
 *         name, password, href, referrer, optional ip).
 *    - Rely on the SDK to inject the issued access token into the connection
 *         headers; do not manipulate connection.headers directly.
 *    - Validate the returned IShoppingMallPlatformAdmin.IAuthorized object using
 *         typia.assert.
 * 2. Construct an IShoppingMallErrorSummary.IRequest body representing a short
 *    recent time interval with no additional filters.
 *
 *    - TimeRange.start: now minus 30 minutes, as ISO 8601 date-time string.
 *    - TimeRange.end: now, as ISO 8601 date-time string.
 *    - RoutePrefixes, services, severityLevels, errorCategories, environments:
 *         explicitly set to null (exercise nullable filters without restricting
 *         results).
 *    - TimeBucket: "fifteenMinutes".
 * 3. Call PATCH /shoppingMall/platformAdmin/analytics/logging/errorSummary via
 *    api.functional.shoppingMall.platformAdmin.analytics.logging.errorSummary.index.
 *
 *    - Pass the constructed IRequest body.
 *    - Assert the response as IShoppingMallErrorSummary using typia.assert.
 * 4. Validate high-level invariants on the analytics summary.
 *
 *    - TotalErrorCount >= 0, uniqueErrorSignatures >= 0, errorRatePerMinute >= 0.
 *    - Summary.from <= summary.to.
 *    - RequestedRange.start <= summary.from and requestedRange.end >= summary.to
 *         (allowing the backend to adjust the range but keeping it within
 *         requested bounds).
 *    - For every bucket in summary.buckets:
 *
 *         - ErrorCount >= 0, errorRate >= 0.
 *         - If timeWindowStart/timeWindowEnd are present, they fall within the requested
 *                   [start, end] interval.
 *
 * Note: The test does not assume that there are any actual error logs in the
 * selected interval; it only checks structural correctness and non-negative
 * metrics to keep the scenario robust against empty or low-traffic
 * environments.
 */
export async function test_api_platform_admin_error_summary_basic_happy_path(
  connection: api.IConnection,
) {
  // 1. Register a fresh platform admin and establish authenticated context.
  const joinBody = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Build a recent time window (last 30 minutes) for error summary.
  const now = new Date();
  const thirtyMinutesMs = 30 * 60 * 1000;
  const startDate = new Date(now.getTime() - thirtyMinutesMs);
  const endDate = now;

  const timeRange: IShoppingMallAnalyticsTimeRange = {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  };

  const requestBody = {
    timeRange,
    routePrefixes: null,
    services: null,
    severityLevels: null,
    errorCategories: null,
    environments: null,
    timeBucket: "fifteenMinutes" as IShoppingMallAnalyticsTimeBucketOption,
  } satisfies IShoppingMallErrorSummary.IRequest;

  // 3. Call the error summary endpoint.
  const summary: IShoppingMallErrorSummary =
    await api.functional.shoppingMall.platformAdmin.analytics.logging.errorSummary.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IShoppingMallErrorSummary>(summary);

  // 4. Validate high-level invariants on the response.
  // 4.1 Non-negative aggregate metrics.
  TestValidator.predicate(
    "totalErrorCount is non-negative",
    summary.totalErrorCount >= 0,
  );
  TestValidator.predicate(
    "uniqueErrorSignatures is non-negative",
    summary.uniqueErrorSignatures >= 0,
  );
  TestValidator.predicate(
    "errorRatePerMinute is non-negative",
    summary.errorRatePerMinute >= 0,
  );

  // 4.2 Temporal consistency between requested time range and actual summary.
  const requestedStartMs = timeRange.start
    ? new Date(timeRange.start).getTime()
    : NaN;
  const requestedEndMs = timeRange.end
    ? new Date(timeRange.end).getTime()
    : NaN;
  const summaryFromMs = new Date(summary.from).getTime();
  const summaryToMs = new Date(summary.to).getTime();

  TestValidator.predicate(
    "requested start and end timestamps are valid",
    !Number.isNaN(requestedStartMs) && !Number.isNaN(requestedEndMs),
  );
  TestValidator.predicate(
    "summary from and to timestamps are valid",
    !Number.isNaN(summaryFromMs) && !Number.isNaN(summaryToMs),
  );
  TestValidator.predicate(
    "summary.from is not after summary.to",
    summaryFromMs <= summaryToMs,
  );
  TestValidator.predicate(
    "summary.from is not before requested start",
    requestedStartMs <= summaryFromMs,
  );
  TestValidator.predicate(
    "summary.to is not after requested end",
    summaryToMs <= requestedEndMs,
  );

  // 4.3 Per-bucket invariants: non-negative metrics and optional time window
  // alignment with requested range when timestamps are present.
  for (const [index, bucket] of summary.buckets.entries()) {
    TestValidator.predicate(
      `bucket[${index}].errorCount is non-negative`,
      bucket.errorCount >= 0,
    );
    TestValidator.predicate(
      `bucket[${index}].errorRate is non-negative`,
      bucket.errorRate >= 0,
    );

    if (bucket.timeWindowStart !== undefined) {
      const bucketStartMs = new Date(bucket.timeWindowStart).getTime();
      TestValidator.predicate(
        `bucket[${index}].timeWindowStart is within requested range`,
        !Number.isNaN(bucketStartMs) &&
          requestedStartMs <= bucketStartMs &&
          bucketStartMs <= requestedEndMs,
      );
    }

    if (bucket.timeWindowEnd !== undefined) {
      const bucketEndMs = new Date(bucket.timeWindowEnd).getTime();
      TestValidator.predicate(
        `bucket[${index}].timeWindowEnd is within requested range`,
        !Number.isNaN(bucketEndMs) &&
          requestedStartMs <= bucketEndMs &&
          bucketEndMs <= requestedEndMs,
      );
    }
  }
}
