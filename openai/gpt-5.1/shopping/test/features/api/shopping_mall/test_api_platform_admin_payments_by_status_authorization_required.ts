import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallPaymentStatusStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentStatusStatistics";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Ensure that only authenticated platform administrators can access payment
 * status statistics.
 *
 * Business goals:
 *
 * 1. Unauthenticated callers must not be able to read payment status statistics.
 * 2. Authenticated customers (actor_type="customer") must also be rejected.
 * 3. Authenticated platform admins (actor_type="platformAdmin") must succeed and
 *    receive a valid IShoppingMallPaymentStatusStatistics object.
 *
 * Scenario steps:
 *
 * 1. Try to call the statistics endpoint without any authentication and assert
 *    that it throws an error.
 * 2. Register+authenticate a customer using /auth/customer/join and attempt to
 *    call the statistics endpoint; assert that it throws an error.
 * 3. Register+authenticate a platform admin using /auth/platformAdmin/join, then
 *    call the statistics endpoint; assert that it succeeds and returns valid
 *    statistics data.
 */
export async function test_api_platform_admin_payments_by_status_authorization_required(
  connection: api.IConnection,
) {
  // 1. Unauthenticated access must fail
  const unauthConnection: api.IConnection = { ...connection };

  await TestValidator.error(
    "unauthenticated access must be rejected",
    async () => {
      await api.functional.shoppingMall.platformAdmin.statistics.payments_by_status.index(
        unauthConnection,
      );
    },
  );

  // 2. Customer join and access attempt must fail
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(2),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuth);

  await TestValidator.error(
    "customer-authenticated access must be rejected",
    async () => {
      await api.functional.shoppingMall.platformAdmin.statistics.payments_by_status.index(
        connection,
      );
    },
  );

  // 3. Platform admin join and successful statistics access
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphabets(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuth: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminAuth);

  const stats: IShoppingMallPaymentStatusStatistics =
    await api.functional.shoppingMall.platformAdmin.statistics.payments_by_status.index(
      connection,
    );
  typia.assert<IShoppingMallPaymentStatusStatistics>(stats);

  // Basic business sanity checks on statistics structure
  TestValidator.predicate(
    "buckets array should exist (length >= 0)",
    stats.buckets.length >= 0,
  );

  TestValidator.predicate(
    "overall.totalTransactionCount should be non-negative",
    stats.overall.totalTransactionCount >= 0,
  );

  TestValidator.predicate(
    "overall.totalAmount should be non-negative",
    stats.overall.totalAmount >= 0,
  );

  for (const bucket of stats.buckets) {
    TestValidator.predicate(
      "bucket.status should be a non-empty string",
      typeof bucket.status === "string" && bucket.status.length > 0,
    );

    TestValidator.predicate(
      "bucket.transactionCount should be non-negative",
      bucket.transactionCount >= 0,
    );

    TestValidator.predicate(
      "bucket.totalAmount should be non-negative",
      bucket.totalAmount >= 0,
    );
  }
}
