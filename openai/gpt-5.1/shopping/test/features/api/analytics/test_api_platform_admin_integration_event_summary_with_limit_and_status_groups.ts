import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallIntegrationEventSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallIntegrationEventSummary";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that platform admin integration event analytics honors limit and
 * statusGroups.
 *
 * Business goal:
 *
 * - Ensure that a platform administrator can fetch an integration event summary
 *   filtered to specific status groups (e.g., FAILURE) and capped by a
 *   client-provided limit on the number of buckets.
 * - Confirm that the returned bucket list and high-level totals are numerically
 *   consistent under those constraints.
 *
 * Scenario:
 *
 * 1. Join as a new platform admin to obtain an authorized session and tokens.
 * 2. Build an integration event analytics request with:
 *
 *    - A recent time window (last 24 hours).
 *    - StatusGroups = ["FAILURE"] so only failure buckets are considered.
 *    - GroupBy = "partner" to group metrics per integration partner.
 *    - Limit = 5 to cap the number of returned buckets.
 *    - IncludeLatencyPercentiles = false to simplify computation.
 * 3. Call the integrationEventSummary.index endpoint with this request.
 * 4. Assert that:
 *
 *    - Bucket count does not exceed the requested limit.
 *    - All bucket.statusGroup values equal "FAILURE".
 *    - Per-bucket counts are non-negative and failureCount/successCount do not
 *         exceed eventCount.
 *    - TotalEvents, totalSuccesses, totalFailures are non-negative and satisfy
 *         totalEvents === totalSuccesses + totalFailures.
 *    - Sum of bucket.eventCount and bucket.failureCount do not exceed their
 *         corresponding global totals, allowing for truncation by limit.
 */
export async function test_api_platform_admin_integration_event_summary_with_limit_and_status_groups(
  connection: api.IConnection,
) {
  // 1. Join as platform admin (authentication bootstrap)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "Passw0rd!",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Build analytics request body focusing on FAILURE statusGroup
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const fromDate = new Date(now.getTime() - oneDayMs).toISOString();
  const toDate = now.toISOString();

  const limit = 5;

  const requestBody = {
    from: fromDate as string & tags.Format<"date-time">,
    to: toDate as string & tags.Format<"date-time">,
    // Omit integrationPartnerKeys and eventTypes to include all
    statusGroups: ["FAILURE"],
    groupBy: "partner",
    limit,
    includeLatencyPercentiles: false,
  } satisfies IShoppingMallIntegrationEventSummary.IRequest;

  // 3. Call integration event summary endpoint
  const summary =
    await api.functional.shoppingMall.platformAdmin.analytics.logging.integrationEventSummary.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IShoppingMallIntegrationEventSummary>(summary);

  const { buckets, totalEvents, totalSuccesses, totalFailures } = summary;

  // 4. Validate bucket-level limit and statusGroups behavior
  TestValidator.predicate(
    "bucket count must not exceed requested limit",
    buckets.length <= limit,
  );

  for (const bucket of buckets) {
    TestValidator.equals(
      "bucket statusGroup must be FAILURE",
      bucket.statusGroup,
      "FAILURE",
    );

    TestValidator.predicate(
      "bucket eventCount must be non-negative",
      bucket.eventCount >= 0,
    );

    TestValidator.predicate(
      "bucket successCount must be non-negative",
      bucket.successCount >= 0,
    );

    TestValidator.predicate(
      "bucket failureCount must be non-negative",
      bucket.failureCount >= 0,
    );

    TestValidator.predicate(
      "bucket failureCount must not exceed eventCount",
      bucket.failureCount <= bucket.eventCount,
    );

    TestValidator.predicate(
      "bucket successCount must not exceed eventCount",
      bucket.successCount <= bucket.eventCount,
    );
  }

  // 5. Validate overall totals consistency
  TestValidator.predicate("totalEvents must be non-negative", totalEvents >= 0);
  TestValidator.predicate(
    "totalSuccesses must be non-negative",
    totalSuccesses >= 0,
  );
  TestValidator.predicate(
    "totalFailures must be non-negative",
    totalFailures >= 0,
  );

  TestValidator.equals(
    "totalEvents equals totalSuccesses + totalFailures",
    totalEvents,
    totalSuccesses + totalFailures,
  );

  const bucketTotals = buckets.reduce(
    (acc, b) => {
      acc.events += b.eventCount;
      acc.failures += b.failureCount;
      return acc;
    },
    { events: 0, failures: 0 },
  );

  TestValidator.predicate(
    "sum of bucket eventCount must not exceed totalEvents",
    bucketTotals.events <= totalEvents,
  );

  TestValidator.predicate(
    "sum of bucket failureCount must not exceed totalFailures",
    bucketTotals.failures <= totalFailures,
  );
}
