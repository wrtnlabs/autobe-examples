import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallIntegrationEventSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallIntegrationEventSummary";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate integration event summary behavior for no-data intervals.
 *
 * Business goal: Ensure that when a platform administrator queries the
 * integration event analytics summary over a time window that contains no
 * events, the
 * /shoppingMall/platformAdmin/analytics/logging/integrationEventSummary
 * endpoint responds with a well-formed IShoppingMallIntegrationEventSummary
 * whose totals are zero and whose buckets either are empty or contain only
 * zero-count, zero-errorRatio entries.
 *
 * High-level steps:
 *
 * 1. Join as a platform admin using POST /auth/platformAdmin/join to obtain an
 *    authorized admin session on the provided connection.
 * 2. Build an IShoppingMallIntegrationEventSummary.IRequest for a far-future time
 *    interval that is expected to have no integration events.
 * 3. Call PATCH
 *    /shoppingMall/platformAdmin/analytics/logging/integrationEventSummary with
 *    that request body.
 * 4. Assert the response is structurally valid using typia.assert.
 * 5. Assert that totalEvents, totalSuccesses, and totalFailures are all zero.
 * 6. Assert bucket-level behavior:
 *
 *    - If no buckets are returned, accept as valid for a no-data interval.
 *    - If buckets are returned, assert every bucket has eventCount === 0,
 *         successCount === 0, failureCount === 0, and errorRatio === 0.
 */
export async function test_api_platform_admin_integration_event_summary_no_data_interval(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin to obtain an authorized session.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Build an analytics request for a far-future interval with no data.
  const from = new Date("2100-01-01T00:00:00.000Z").toISOString();
  const to = new Date("2100-01-01T01:00:00.000Z").toISOString();

  const summaryRequest = {
    from,
    to,
    includeLatencyPercentiles: true,
  } satisfies IShoppingMallIntegrationEventSummary.IRequest;

  // 3. Call the integration event summary endpoint.
  const summary: IShoppingMallIntegrationEventSummary =
    await api.functional.shoppingMall.platformAdmin.analytics.logging.integrationEventSummary.index(
      connection,
      { body: summaryRequest },
    );

  // 4. Validate response type.
  typia.assert(summary);

  // 5. Assert global totals are zero for a no-data interval.
  TestValidator.equals(
    "integration event summary: totalEvents should be zero for no-data interval",
    summary.totalEvents,
    0,
  );
  TestValidator.equals(
    "integration event summary: totalSuccesses should be zero for no-data interval",
    summary.totalSuccesses,
    0,
  );
  TestValidator.equals(
    "integration event summary: totalFailures should be zero for no-data interval",
    summary.totalFailures,
    0,
  );

  // 6. Assert bucket-level behavior for no-data interval.
  if (summary.buckets.length === 0) {
    // Explicit assertion that empty buckets array is acceptable.
    TestValidator.predicate(
      "integration event summary: buckets array may be empty for no-data interval",
      summary.buckets.length === 0,
    );
  } else {
    for (const [index, bucket] of summary.buckets.entries()) {
      TestValidator.equals(
        `integration event summary: bucket[${index}].eventCount should be zero for no-data interval`,
        bucket.eventCount,
        0,
      );
      TestValidator.equals(
        `integration event summary: bucket[${index}].successCount should be zero for no-data interval`,
        bucket.successCount,
        0,
      );
      TestValidator.equals(
        `integration event summary: bucket[${index}].failureCount should be zero for no-data interval`,
        bucket.failureCount,
        0,
      );
      TestValidator.equals(
        `integration event summary: bucket[${index}].errorRatio should be zero for no-data interval`,
        bucket.errorRatio,
        0,
      );
    }
  }
}
