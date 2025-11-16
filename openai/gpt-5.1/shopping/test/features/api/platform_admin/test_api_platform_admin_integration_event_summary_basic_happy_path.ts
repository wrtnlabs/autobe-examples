import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallIntegrationEventSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallIntegrationEventSummary";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Happy-path E2E test for the platform admin integration event summary
 * endpoint.
 *
 * This test verifies that:
 *
 * 1. A platform administrator can be registered via POST /auth/platformAdmin/join.
 * 2. The join flow returns an authorized admin session with JWT tokens and
 *    automatically authenticates subsequent requests through the shared
 *    connection object.
 * 3. The analytics endpoint PATCH
 *    /shoppingMall/platformAdmin/analytics/logging/integrationEventSummary can
 *    be called with a minimal-yet-explicit filter set (recent time window,
 *    empty filter arrays, groupBy="time", timeGranularity="hour",
 *    includeLatencyPercentiles=true).
 * 4. The response conforms to IShoppingMallIntegrationEventSummary and basic
 *    aggregate invariants hold between bucket-level counts and top-level
 *    totals.
 */
export async function test_api_platform_admin_integration_event_summary_basic_happy_path(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin and obtain an authorized session.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    // Provide realistic href/referrer values as valid URIs.
    href: "https://admin.shopping-mall.local/onboarding",
    referrer: "https://shopping-mall.local/landing/platform-admin",
    // Optional ip is omitted here to let the backend infer it if desired.
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Build a recent time window for the analytics query (last 1 hour).
  const now = new Date();
  const oneHourMs = 60 * 60 * 1000;
  const fromDate = new Date(now.getTime() - oneHourMs);

  const summaryRequestBody = {
    from: fromDate.toISOString(),
    to: now.toISOString(),
    integrationPartnerKeys: [],
    eventTypes: [],
    statusGroups: [],
    groupBy: "time",
    timeGranularity: "hour",
    includeLatencyPercentiles: true,
    // limit is omitted to use server default.
  } satisfies IShoppingMallIntegrationEventSummary.IRequest;

  // 3. Call the integration event summary endpoint.
  const summary: IShoppingMallIntegrationEventSummary =
    await api.functional.shoppingMall.platformAdmin.analytics.logging.integrationEventSummary.index(
      connection,
      {
        body: summaryRequestBody,
      },
    );
  typia.assert(summary);

  // 4. Validate aggregate invariants between buckets and top-level totals.
  const sumEventCount = summary.buckets.reduce(
    (accumulator, bucket) => accumulator + bucket.eventCount,
    0,
  );
  const sumSuccessCount = summary.buckets.reduce(
    (accumulator, bucket) => accumulator + bucket.successCount,
    0,
  );
  const sumFailureCount = summary.buckets.reduce(
    (accumulator, bucket) => accumulator + bucket.failureCount,
    0,
  );

  TestValidator.equals(
    "totalEvents matches sum of bucket.eventCount",
    sumEventCount,
    summary.totalEvents,
  );
  TestValidator.equals(
    "totalSuccesses matches sum of bucket.successCount",
    sumSuccessCount,
    summary.totalSuccesses,
  );
  TestValidator.equals(
    "totalFailures matches sum of bucket.failureCount",
    sumFailureCount,
    summary.totalFailures,
  );

  TestValidator.equals(
    "totalEvents equals totalSuccesses + totalFailures",
    summary.totalSuccesses + summary.totalFailures,
    summary.totalEvents,
  );

  // 5. Per-bucket sanity checks (only when there is data).
  for (const bucket of summary.buckets) {
    TestValidator.predicate(
      "bucket eventCount is at least successCount",
      bucket.eventCount >= bucket.successCount,
    );
    TestValidator.predicate(
      "bucket eventCount is at least failureCount",
      bucket.eventCount >= bucket.failureCount,
    );

    if (bucket.eventCount > 0) {
      TestValidator.predicate(
        "bucket errorRatio is between 0 and 1 when eventCount > 0",
        bucket.errorRatio >= 0 && bucket.errorRatio <= 1,
      );
    }
  }
}
