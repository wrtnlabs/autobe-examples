import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallRefundReasonStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundReasonStatistics";

/**
 * Ensure that refunds-by-reason statistics are accessible only to platform
 * admins.
 *
 * This test verifies the role-based access control behaviour of the GET
 * /shoppingMall/platformAdmin/statistics/refunds-by-reason endpoint across
 * three contexts:
 *
 * 1. Unauthenticated caller (no Authorization header) must not be able to access
 *    the statistics.
 * 2. Authenticated customer must not be able to access the statistics.
 * 3. Authenticated platform admin must be able to access the statistics and
 *    receive a valid IShoppingMallRefundReasonStatistics payload.
 */
export async function test_api_platform_admin_refunds_by_reason_authorization_required(
  connection: api.IConnection,
) {
  // 1. Unauthenticated access: clone connection without headers
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthenticated access must fail", async () => {
    await api.functional.shoppingMall.platformAdmin.statistics.refunds_by_reason.index(
      unauthenticated,
    );
  });

  // 2. Customer joins and becomes authenticated on main connection
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "customer-password-1234",
    name: RandomGenerator.name(),
    // let backend infer IP
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // 3. Customer-authenticated access must fail
  await TestValidator.error(
    "customer-authenticated access must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.statistics.refunds_by_reason.index(
        connection,
      );
    },
  );

  // 4. Platform admin joins and becomes authenticated on main connection
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "admin-password-1234",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminAuthorized);

  // 5. Platform admin-authenticated access must succeed
  const stats: IShoppingMallRefundReasonStatistics =
    await api.functional.shoppingMall.platformAdmin.statistics.refunds_by_reason.index(
      connection,
    );
  typia.assert<IShoppingMallRefundReasonStatistics>(stats);

  // 6. Basic sanity checks on refunded aggregates
  const totalBucketRefundCount = stats.buckets.reduce(
    (sum, bucket) => sum + bucket.refundCount,
    0,
  );
  const totalBucketRefundAmount = stats.buckets.reduce(
    (sum, bucket) => sum + bucket.totalRefundAmount,
    0,
  );

  TestValidator.predicate(
    "total bucket refundCount must be <= overall.totalRefundCount",
    totalBucketRefundCount <= stats.overall.totalRefundCount,
  );

  TestValidator.predicate(
    "total bucket totalRefundAmount must be <= overall.totalRefundAmount",
    totalBucketRefundAmount <= stats.overall.totalRefundAmount,
  );
}
