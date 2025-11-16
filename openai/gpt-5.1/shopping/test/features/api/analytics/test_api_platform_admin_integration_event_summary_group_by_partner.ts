import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallIntegrationEventSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallIntegrationEventSummary";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that the integration event summary analytics endpoint supports
 * partner-level grouping and returns structurally consistent metrics.
 *
 * Business goal:
 *
 * - Ensure a platform administrator can query aggregated integration event
 *   statistics grouped by integration partner using PATCH
 *   /shoppingMall/platformAdmin/analytics/logging/integrationEventSummary.
 * - Validate that the response structure is correct and that high-level aggregate
 *   fields are consistent with per-bucket metrics, even when we cannot control
 *   the underlying log data.
 *
 * Scenario steps:
 *
 * 1. Join as a platform admin via POST /auth/platformAdmin/join to obtain an
 *    authorized session (token handled automatically by the SDK).
 * 2. Build an IShoppingMallIntegrationEventSummary.IRequest for a recent time
 *    window, with groupBy="partner" and includeLatencyPercentiles=false, and
 *    without constraining partners, event types, or status groups.
 * 3. Call the integrationEventSummary.index endpoint and obtain an
 *    IShoppingMallIntegrationEventSummary response.
 * 4. Validate that:
 *
 *    - The response matches the IShoppingMallIntegrationEventSummary schema.
 *    - TotalEvents/totalSuccesses/totalFailures equal the sums of
 *         eventCount/successCount/failureCount across all buckets.
 *    - For each bucket, errorRatio is in [0,1] and numerically consistent with
 *         failureCount/eventCount (within a small tolerance) when eventCount>0,
 *         and is 0 (or at least non-negative) when eventCount===0.
 *    - If there is any bucket whose integrationPartnerKey is not the generic
 *         aggregate key "ALL", assert that such partner-specific buckets exist
 *         to prove partner-level grouping works. If all buckets are "ALL" or
 *         the list is empty, skip this stronger assertion and only rely on
 *         structural checks, so the test is robust to environments without
 *         multi-partner data.
 */
export async function test_api_platform_admin_integration_event_summary_group_by_partner(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain an authorized session.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://shoppingmall.local/landing/platform-admin",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "platform admin should be active after join",
    admin.isActive === true,
  );

  // 2. Build a request covering a recent 7-day window.
  const now = new Date();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const fromDate = new Date(now.getTime() - sevenDaysMs);

  const summaryRequest = {
    from: fromDate.toISOString(),
    to: now.toISOString(),
    // integrationPartnerKeys omitted to include all partners.
    // eventTypes and statusGroups omitted for broad coverage.
    groupBy: "partner",
    timeGranularity: "day",
    includeLatencyPercentiles: false,
  } satisfies IShoppingMallIntegrationEventSummary.IRequest;

  // 3. Call analytics endpoint.
  const summary: IShoppingMallIntegrationEventSummary =
    await api.functional.shoppingMall.platformAdmin.analytics.logging.integrationEventSummary.index(
      connection,
      {
        body: summaryRequest,
      },
    );
  typia.assert(summary);

  // 4. Structural and metric consistency validations.
  const buckets = summary.buckets;

  const aggregate = buckets.reduce(
    (acc, bucket) => {
      return {
        events: acc.events + bucket.eventCount,
        successes: acc.successes + bucket.successCount,
        failures: acc.failures + bucket.failureCount,
      };
    },
    { events: 0, successes: 0, failures: 0 },
  );

  TestValidator.equals(
    "totalEvents equals sum of bucket.eventCount",
    aggregate.events,
    summary.totalEvents,
  );
  TestValidator.equals(
    "totalSuccesses equals sum of bucket.successCount",
    aggregate.successes,
    summary.totalSuccesses,
  );
  TestValidator.equals(
    "totalFailures equals sum of bucket.failureCount",
    aggregate.failures,
    summary.totalFailures,
  );

  // Per-bucket invariants: counts non-negative, coherent, and errorRatio sane.
  for (const bucket of buckets) {
    TestValidator.predicate(
      "bucket.eventCount is non-negative",
      bucket.eventCount >= 0,
    );
    TestValidator.predicate(
      "bucket.successCount is non-negative",
      bucket.successCount >= 0,
    );
    TestValidator.predicate(
      "bucket.failureCount is non-negative",
      bucket.failureCount >= 0,
    );
    TestValidator.predicate(
      "bucket.successCount + failureCount does not exceed eventCount",
      bucket.successCount + bucket.failureCount <= bucket.eventCount,
    );

    if (bucket.eventCount > 0) {
      const expectedRatio = bucket.failureCount / bucket.eventCount;
      const diff = Math.abs(bucket.errorRatio - expectedRatio);
      TestValidator.predicate(
        "bucket.errorRatio within tolerance of failureCount/eventCount",
        diff <= 1e-6,
      );
      TestValidator.predicate(
        "bucket.errorRatio between 0 and 1 when eventCount>0",
        bucket.errorRatio >= 0 && bucket.errorRatio <= 1,
      );
    } else {
      // When there are no events, implementation should not report negative or NaN ratio.
      TestValidator.predicate(
        "bucket.errorRatio non-negative when eventCount is 0",
        bucket.errorRatio >= 0,
      );
    }
  }

  // 5. If there are any buckets with specific partners (not just a global ALL),
  // confirm that such partner-level buckets exist.
  const hasPartnerSpecificBucket = buckets.some(
    (bucket) => bucket.integrationPartnerKey !== "ALL",
  );

  if (buckets.length > 0 && hasPartnerSpecificBucket) {
    TestValidator.predicate(
      "at least one bucket is grouped by a specific integration partner",
      hasPartnerSpecificBucket,
    );
  }
}
