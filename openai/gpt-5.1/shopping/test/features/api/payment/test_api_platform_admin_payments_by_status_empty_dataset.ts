import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPaymentStatusStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentStatusStatistics";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate payments-by-status statistics behavior for an empty dataset.
 *
 * Business goal
 *
 * - Ensure that the platform admin statistics endpoint for payment status
 *   aggregates works correctly when there are no payment transactions in the
 *   system yet.
 * - The endpoint must return a valid IShoppingMallPaymentStatusStatistics DTO
 *   with zero totals instead of failing or returning null/undefined fields.
 *
 * Scenario
 *
 * 1. Register and authenticate a platform admin via POST /auth/platformAdmin/join.
 *
 *    - Use IShoppingMallPlatformAdminJoin.IRequest as the request body.
 *    - After this call the SDK automatically wires the Authorization header on the
 *         provided connection, so subsequent calls run as that admin.
 * 2. Do NOT create any payments in this test. We assume the test harness uses an
 *    isolated database or a transaction-per-test, so the absence of payment
 *    creation within this test implies an empty payment_transactions table.
 * 3. Call GET /shoppingMall/platformAdmin/statistics/payments-by-status via
 *    api.functional.shoppingMall.platformAdmin.statistics.payments_by_status.index.
 * 4. Validate that the response:
 *
 *    - Is structurally correct using typia.assert.
 *    - Represents an empty dataset:
 *
 *         - Buckets is an empty array (preferred) OR, if implementation chooses to
 *                   pre-seed known statuses, every bucket has transactionCount
 *                   === 0 and totalAmount === 0.
 *         - Overall.totalTransactionCount === 0.
 *         - Overall.totalAmount === 0.
 *
 * Notes
 *
 * - We must not touch connection.headers directly; authentication is already
 *   handled by the join endpoint.
 * - We must not assert specific HTTP status codes; the SDK either resolves or
 *   throws.
 * - Type correctness is fully covered by typia.assert, so additional field type
 *   checks are unnecessary.
 */
export async function test_api_platform_admin_payments_by_status_empty_dataset(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin.
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(admin);

  // 2. Do not create any payments. We rely on the clean database state
  //    established by the test harness.

  // 3. Call payments-by-status statistics as the authenticated platform admin.
  const stats: IShoppingMallPaymentStatusStatistics =
    await api.functional.shoppingMall.platformAdmin.statistics.payments_by_status.index(
      connection,
    );
  typia.assert(stats);

  // 4. Business-level validations for empty dataset semantics.
  // 4-1. overall must show zero totals.
  TestValidator.equals(
    "overall totalTransactionCount must be 0 when no payments exist",
    stats.overall.totalTransactionCount,
    0,
  );
  TestValidator.equals(
    "overall totalAmount must be 0 when no payments exist",
    stats.overall.totalAmount,
    0,
  );

  // 4-2. buckets must either be empty OR all zero-valued.
  if (stats.buckets.length === 0) {
    // Preferred behavior: completely empty buckets array.
    TestValidator.equals(
      "buckets array should be empty when there are no payments",
      stats.buckets.length,
      0,
    );
  } else {
    // Acceptable alternative: predefined statuses with zero counts and amounts.
    for (const bucket of stats.buckets) {
      TestValidator.equals(
        "each bucket.transactionCount must be 0 when there are no payments",
        bucket.transactionCount,
        0,
      );
      TestValidator.equals(
        "each bucket.totalAmount must be 0 when there are no payments",
        bucket.totalAmount,
        0,
      );
    }
  }
}
