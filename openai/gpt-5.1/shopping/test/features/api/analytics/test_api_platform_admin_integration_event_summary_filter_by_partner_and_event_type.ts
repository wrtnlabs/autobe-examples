import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallIntegrationEventSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallIntegrationEventSummary";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_integration_event_summary_filter_by_partner_and_event_type(
  connection: api.IConnection,
) {
  // 1. Register (join) a platform administrator to obtain authorized session
  //    and JWT tokens. The SDK will automatically set Authorization header
  //    on the provided connection instance.
  const joinRequestBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/onboarding",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequestBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Build analytics query request body focusing on a particular
  //    integration partner and event type. We cannot seed the underlying
  //    logs from this test, so we instead focus on verifying that the
  //    filtering options are correctly reflected in the response buckets
  //    when any data exists.
  const now: Date = new Date();
  const oneHourMs = 60 * 60 * 1000;
  const fromDate = new Date(now.getTime() - oneHourMs);

  const summaryRequestBody = {
    from: fromDate.toISOString(),
    to: now.toISOString(),
    integrationPartnerKeys: ["PAYMENT_GATEWAY"],
    eventTypes: ["paymentCallback"],
    statusGroups: ["SUCCESS", "FAILURE"],
    groupBy: "time",
    timeGranularity: "hour",
    includeLatencyPercentiles: true,
  } satisfies IShoppingMallIntegrationEventSummary.IRequest;

  const summary: IShoppingMallIntegrationEventSummary =
    await api.functional.shoppingMall.platformAdmin.analytics.logging.integrationEventSummary.index(
      connection,
      {
        body: summaryRequestBody,
      },
    );
  typia.assert<IShoppingMallIntegrationEventSummary>(summary);

  // 3. If there are any buckets, validate that they respect the
  //    integrationPartnerKeys and eventTypes filters, and that their
  //    errorRatio and counts are internally consistent.
  const buckets: IShoppingMallIntegrationEventSummary.IBucket[] =
    summary.buckets;

  // Basic sanity: totalEvents should be at least the sum of bucket eventCount
  // (or equal, depending on server implementation). We can at least verify
  // that totalEvents is not less than the per-bucket sum.
  const totalBucketEvents = buckets.reduce(
    (acc, b) => acc + b.eventCount,
    0 as number,
  );
  TestValidator.predicate(
    "totalEvents should be >= sum of bucket.eventCount",
    summary.totalEvents >= totalBucketEvents,
  );

  // When there are buckets, validate filter and internal consistency.
  if (buckets.length > 0) {
    for (const bucket of buckets) {
      // Ensure filter keys are respected
      TestValidator.equals(
        "bucket.integrationPartnerKey must match requested filter",
        bucket.integrationPartnerKey,
        "PAYMENT_GATEWAY",
      );
      TestValidator.equals(
        "bucket.eventType must match requested filter",
        bucket.eventType,
        "paymentCallback",
      );

      // Status group should be one of the requested ones when explicitly set
      TestValidator.predicate(
        "statusGroup should be SUCCESS or FAILURE",
        bucket.statusGroup === "SUCCESS" || bucket.statusGroup === "FAILURE",
      );

      // Counts must be non-negative and consistent
      TestValidator.predicate(
        "eventCount must be non-negative",
        bucket.eventCount >= 0,
      );
      TestValidator.predicate(
        "successCount must be non-negative",
        bucket.successCount >= 0,
      );
      TestValidator.predicate(
        "failureCount must be non-negative",
        bucket.failureCount >= 0,
      );

      TestValidator.equals(
        "eventCount equals successCount + failureCount",
        bucket.eventCount,
        bucket.successCount + bucket.failureCount,
      );

      // Validate errorRatio alignment when eventCount > 0. Allow small
      // floating point tolerance since errorRatio is a derived value.
      if (bucket.eventCount > 0) {
        const expectedRatio = bucket.failureCount / bucket.eventCount;
        const diff = Math.abs(bucket.errorRatio - expectedRatio);
        TestValidator.predicate(
          "errorRatio approximately equals failureCount / eventCount",
          diff <= 0.000001,
        );
      } else {
        // When there are no events, errorRatio should be 0 by convention.
        TestValidator.equals(
          "errorRatio should be 0 when eventCount is 0",
          bucket.errorRatio,
          0,
        );
      }

      // Latency metrics should be non-negative and ordered logically.
      TestValidator.predicate(
        "avgLatencyMs must be non-negative",
        bucket.avgLatencyMs >= 0,
      );
      TestValidator.predicate(
        "p50LatencyMs must be non-negative",
        bucket.p50LatencyMs >= 0,
      );
      TestValidator.predicate(
        "p90LatencyMs must be non-negative",
        bucket.p90LatencyMs >= 0,
      );
      TestValidator.predicate(
        "p99LatencyMs must be non-negative",
        bucket.p99LatencyMs >= 0,
      );

      TestValidator.predicate(
        "percentile latencies should be ordered p50 <= p90 <= p99",
        bucket.p50LatencyMs <= bucket.p90LatencyMs &&
          bucket.p90LatencyMs <= bucket.p99LatencyMs,
      );
    }
  }
}
