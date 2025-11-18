import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerPerformanceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPerformanceSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPerformanceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceSnapshot";

/**
 * Enforce admin-only access control for seller performance snapshot search.
 *
 * This test verifies that the PATCH
 * /shoppingMall/admin/sellerPerformanceSnapshots analytics endpoint cannot be
 * accessed by unauthenticated callers or by authenticated customers, and that
 * it succeeds only when the caller is an authenticated admin.
 *
 * Business flow:
 *
 * 1. Prepare a minimal but valid IShoppingMallSellerPerformanceSnapshot.IRequest
 *    body with a reasonable snapshot date range and pagination values.
 * 2. As an unauthenticated client (no Authorization header), attempt to call
 *    sellerPerformanceSnapshots.index and expect an authorization error.
 * 3. Register a customer with POST /auth/customer/join, which authenticates the
 *    connection as a customer, then call sellerPerformanceSnapshots.index again
 *    and expect an authorization error because customers must not access admin
 *    analytics.
 * 4. Register an admin with POST /auth/admin/join, which authenticates the
 *    connection as an admin, then call sellerPerformanceSnapshots.index with
 *    the same request body and expect a successful response containing a valid
 *    IPageIShoppingMallSellerPerformanceSnapshot.ISummary payload.
 */
export async function test_api_seller_performance_snapshots_authorization_enforced(
  connection: api.IConnection,
) {
  // 1. Prepare a reusable search request body covering a recent snapshot window
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const requestBody = {
    snapshotDateFrom: sevenDaysAgo.toISOString(),
    snapshotDateTo: now.toISOString(),
    page: 1,
    limit: 10,
  } satisfies IShoppingMallSellerPerformanceSnapshot.IRequest;

  // 2. Unauthenticated call: clone connection with empty headers and expect error
  const anonymous: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated client cannot access admin seller performance snapshots",
    async () => {
      await api.functional.shoppingMall.admin.sellerPerformanceSnapshots.index(
        anonymous,
        { body: requestBody },
      );
    },
  );

  // 3. Customer-authenticated call should also be rejected
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: typia.random<IShoppingMallCustomerJoin.IRequest>(),
    });
  typia.assert(customer);

  await TestValidator.error(
    "customer actor cannot access admin seller performance snapshots",
    async () => {
      await api.functional.shoppingMall.admin.sellerPerformanceSnapshots.index(
        connection,
        { body: requestBody },
      );
    },
  );

  // 4. Admin-authenticated call should succeed
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: typia.random<IShoppingMallAdminJoin.ICreate>(),
    });
  typia.assert(admin);

  const page: IPageIShoppingMallSellerPerformanceSnapshot.ISummary =
    await api.functional.shoppingMall.admin.sellerPerformanceSnapshots.index(
      connection,
      { body: requestBody },
    );
  typia.assert(page);

  // Basic pagination sanity checks
  TestValidator.equals(
    "pagination current page should match requested page",
    page.pagination.current,
    requestBody.page,
  );
  TestValidator.equals(
    "pagination limit should match requested limit",
    page.pagination.limit,
    requestBody.limit,
  );
  TestValidator.predicate(
    "data length should not exceed pagination limit",
    page.data.length <= page.pagination.limit,
  );
}
