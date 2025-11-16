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

export async function test_api_platform_admin_error_summary_with_narrow_time_range_no_data(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a platform administrator so that
  //    platformAdmin analytics endpoints are authorized.
  const joinRequestBody = {
    email: `platform-admin+no-data-${RandomGenerator.alphaNumeric(12)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequestBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Choose a narrow time range far in the future to guarantee that
  //    no error logs exist for the requested window.
  //    We'll take now, add 365 days, and build a 5 minute window.
  const now = new Date();
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
  const futureStartDate = new Date(now.getTime() + oneYearMs);
  const fiveMinutesMs = 5 * 60 * 1000;
  const futureEndDate = new Date(futureStartDate.getTime() + fiveMinutesMs);

  const timeRange: IShoppingMallAnalyticsTimeRange = {
    start: futureStartDate.toISOString() as string & tags.Format<"date-time">,
    end: futureEndDate.toISOString() as string & tags.Format<"date-time">,
  };

  const requestBody = {
    timeRange,
    routePrefixes: null,
    services: null,
    severityLevels: null,
    errorCategories: null,
    environments: null,
    timeBucket: "hour" as IShoppingMallAnalyticsTimeBucketOption,
  } satisfies IShoppingMallErrorSummary.IRequest;

  // 3. Call the error summary analytics endpoint with the no-data range.
  const summary: IShoppingMallErrorSummary =
    await api.functional.shoppingMall.platformAdmin.analytics.logging.errorSummary.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IShoppingMallErrorSummary>(summary);

  // 4. Validate high-level aggregate metrics are zeroed when no data exists.
  TestValidator.equals(
    "totalErrorCount should be zero when no logs in range",
    summary.totalErrorCount,
    0,
  );
  TestValidator.equals(
    "uniqueErrorSignatures should be zero when no logs in range",
    summary.uniqueErrorSignatures,
    0,
  );
  TestValidator.equals(
    "errorRatePerMinute should be zero when no logs in range",
    summary.errorRatePerMinute,
    0,
  );

  // Buckets may be empty or contain purely zero-valued buckets.
  if (summary.buckets.length === 0) {
    TestValidator.equals(
      "buckets may be empty in no-data scenario",
      summary.buckets.length,
      0,
    );
  } else {
    for (const bucket of summary.buckets) {
      TestValidator.equals(
        "bucket.errorCount should be zero in no-data scenario",
        bucket.errorCount,
        0,
      );
      TestValidator.equals(
        "bucket.errorRate should be zero in no-data scenario",
        bucket.errorRate,
        0,
      );
    }
  }

  // 5. Validate that the effective aggregation window [from, to]
  //    is within the requested [start, end] range.
  const requestedStartMs = futureStartDate.getTime();
  const requestedEndMs = futureEndDate.getTime();
  const actualFromMs = new Date(summary.from).getTime();
  const actualToMs = new Date(summary.to).getTime();

  TestValidator.predicate(
    "summary.from must be >= requested timeRange.start",
    actualFromMs >= requestedStartMs,
  );
  TestValidator.predicate(
    "summary.to must be <= requested timeRange.end",
    actualToMs <= requestedEndMs,
  );
}
