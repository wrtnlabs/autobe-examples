import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPlatformCommission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPlatformCommission";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPlatformCommission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformCommission";

/**
 * Test comprehensive filtering of platform commission records by
 * administrators.
 *
 * This test validates that administrators can use all available filtering
 * options to perform detailed financial analysis across seller commission
 * records. Tests filtering by seller_id, order_id, commission_type, currency,
 * refund status, and various amount/date range filters for administrative
 * financial reporting and revenue reconciliation scenarios.
 *
 * Test workflow:
 *
 * 1. Create and authenticate admin account
 * 2. Test basic pagination without filters
 * 3. Test seller_id filter for seller-specific analysis
 * 4. Test order_id filter for transaction tracing
 * 5. Test commission_type filter for rate structure analysis
 * 6. Test currency filter for multi-currency revenue streams
 * 7. Test is_refunded filter for gross vs net revenue
 * 8. Test commission amount range filters
 * 9. Test refunded amount range filters
 * 10. Test order subtotal range filters
 * 11. Test date range filters for period analysis
 * 12. Test complex filter combinations
 * 13. Test sorting capabilities
 */
export async function test_api_admin_platform_commissions_comprehensive_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Generate a test seller ID for filtering
  const testSellerId = typia.random<string & tags.Format<"uuid">>();
  const testOrderId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Test basic pagination without filters
  const basicResults =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      {
        sellerId: testSellerId,
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(basicResults);
  TestValidator.predicate(
    "pagination structure is valid",
    basicResults.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is applied",
    basicResults.pagination.limit === 20,
  );

  // Step 3: Test seller_id filter for seller-specific analysis
  const sellerFilterResults =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      {
        sellerId: testSellerId,
        body: {
          page: 1,
          limit: 50,
          seller_id: testSellerId,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(sellerFilterResults);

  // Step 4: Test order_id filter for transaction tracing
  const orderFilterResults =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      {
        sellerId: testSellerId,
        body: {
          page: 1,
          limit: 10,
          order_id: testOrderId,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(orderFilterResults);

  // Step 5: Test commission_type filter for rate structure analysis
  const commissionTypes = [
    "standard",
    "category_specific",
    "seller_tier",
    "promotional",
  ] as const;
  const randomCommissionType = RandomGenerator.pick(commissionTypes);

  const commissionTypeResults =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      {
        sellerId: testSellerId,
        body: {
          page: 1,
          limit: 30,
          commission_type: randomCommissionType,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(commissionTypeResults);

  // Step 6: Test currency filter for multi-currency revenue streams
  const currencies = ["USD", "EUR", "GBP", "KRW", "JPY"] as const;
  const randomCurrency = RandomGenerator.pick(currencies);

  const currencyFilterResults =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      {
        sellerId: testSellerId,
        body: {
          page: 1,
          limit: 25,
          currency: randomCurrency,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(currencyFilterResults);

  // Step 7: Test is_refunded filter for gross vs net revenue
  const refundedResults =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      {
        sellerId: testSellerId,
        body: {
          page: 1,
          limit: 20,
          is_refunded: true,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(refundedResults);

  const nonRefundedResults =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      {
        sellerId: testSellerId,
        body: {
          page: 1,
          limit: 20,
          is_refunded: false,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(nonRefundedResults);

  // Step 8: Test commission amount range filters
  const commissionAmountRangeResults =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      {
        sellerId: testSellerId,
        body: {
          page: 1,
          limit: 15,
          min_commission_amount: 10,
          max_commission_amount: 1000,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(commissionAmountRangeResults);

  // Step 9: Test refunded amount range filters
  const refundedAmountRangeResults =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      {
        sellerId: testSellerId,
        body: {
          page: 1,
          limit: 10,
          min_refunded_amount: 0,
          max_refunded_amount: 500,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(refundedAmountRangeResults);

  // Step 10: Test order subtotal range filters
  const orderSubtotalRangeResults =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      {
        sellerId: testSellerId,
        body: {
          page: 1,
          limit: 20,
          min_order_subtotal: 100,
          max_order_subtotal: 5000,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(orderSubtotalRangeResults);

  // Step 11: Test date range filters for period analysis
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateRangeResults =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      {
        sellerId: testSellerId,
        body: {
          page: 1,
          limit: 40,
          created_after: thirtyDaysAgo.toISOString(),
          created_before: now.toISOString(),
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(dateRangeResults);

  // Step 12: Test complex filter combinations for comprehensive analysis
  const complexFilterResults =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      {
        sellerId: testSellerId,
        body: {
          page: 1,
          limit: 50,
          seller_id: testSellerId,
          commission_type: "standard",
          currency: "USD",
          is_refunded: false,
          min_commission_amount: 50,
          max_commission_amount: 2000,
          min_order_subtotal: 200,
          max_order_subtotal: 10000,
          created_after: thirtyDaysAgo.toISOString(),
          created_before: now.toISOString(),
          sort_by: "commission_amount",
          sort_order: "desc",
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(complexFilterResults);
  TestValidator.predicate(
    "complex filter request processed successfully",
    complexFilterResults.pagination !== null &&
      complexFilterResults.pagination !== undefined,
  );

  // Step 13: Test different sorting options
  const sortByCreatedAt =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      {
        sellerId: testSellerId,
        body: {
          page: 1,
          limit: 20,
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(sortByCreatedAt);

  const sortByOrderSubtotal =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      {
        sellerId: testSellerId,
        body: {
          page: 1,
          limit: 20,
          sort_by: "order_subtotal",
          sort_order: "desc",
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(sortByOrderSubtotal);

  // Step 14: Test pagination with filters
  const paginatedResults =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      {
        sellerId: testSellerId,
        body: {
          page: 2,
          limit: 15,
          currency: "USD",
          is_refunded: false,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(paginatedResults);
  TestValidator.predicate(
    "pagination page 2 requested",
    paginatedResults.pagination.current === 2,
  );
}
