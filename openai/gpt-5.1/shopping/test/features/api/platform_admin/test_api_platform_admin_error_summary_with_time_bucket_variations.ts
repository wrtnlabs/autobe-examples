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

export async function test_api_platform_admin_error_summary_with_time_bucket_variations(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to get an authorized session and token
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    // Use simple but valid URIs
    href: "https://admin.shopping-mall.example.com/join",
    referrer: "https://shopping-mall.example.com/",
    ip: null,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Prepare a common time range spanning several hours (e.g., last 6 hours)
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 6 * 60 * 60 * 1000);

  const timeRange: IShoppingMallAnalyticsTimeRange = {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  };

  // 3. All allowed time bucket options
  const timeBuckets = [
    "minute",
    "fiveMinutes",
    "fifteenMinutes",
    "hour",
    "day",
  ] as const satisfies readonly IShoppingMallAnalyticsTimeBucketOption[];

  // 4. Iterate each bucket option and call the analytics endpoint
  for (const bucket of timeBuckets) {
    const requestBody = {
      timeRange,
      timeBucket: bucket,
    } satisfies IShoppingMallErrorSummary.IRequest;

    const summary: IShoppingMallErrorSummary =
      await api.functional.shoppingMall.platformAdmin.analytics.logging.errorSummary.index(
        connection,
        {
          body: requestBody,
        },
      );

    typia.assert<IShoppingMallErrorSummary>(summary);

    // Basic structural and non-negative metric assertions
    TestValidator.predicate(
      `summary buckets array exists for bucket=${bucket}`,
      Array.isArray(summary.buckets) && summary.buckets.length >= 0,
    );

    TestValidator.predicate(
      `summary totalErrorCount is non-negative for bucket=${bucket}`,
      summary.totalErrorCount >= 0,
    );

    TestValidator.predicate(
      `summary uniqueErrorSignatures is non-negative for bucket=${bucket}`,
      summary.uniqueErrorSignatures >= 0,
    );

    TestValidator.predicate(
      `summary errorRatePerMinute is non-negative for bucket=${bucket}`,
      summary.errorRatePerMinute >= 0,
    );

    // Validate each bucket's core metrics are non-negative
    for (const b of summary.buckets) {
      TestValidator.predicate(
        `bucket errorCount is non-negative for bucket=${bucket}`,
        b.errorCount >= 0,
      );

      TestValidator.predicate(
        `bucket errorRate is non-negative for bucket=${bucket}`,
        b.errorRate >= 0,
      );
    }
  }
}
