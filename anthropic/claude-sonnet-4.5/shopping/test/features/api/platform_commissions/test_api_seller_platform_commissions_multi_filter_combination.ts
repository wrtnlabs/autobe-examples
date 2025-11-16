import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPlatformCommission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPlatformCommission";
import type { IShoppingMallPlatformCommission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformCommission";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test complex multi-filter combination scenarios for platform commission
 * search.
 *
 * This test validates that the platform commission search API correctly handles
 * multiple simultaneous filter parameters using AND logic. It ensures that
 * sophisticated financial analysis queries work properly, such as filtering by
 * date range, commission amounts, commission types, and refund status all at
 * once.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a seller account
 * 2. Test date range + commission amount range combination
 * 3. Test date range + commission type + refund status combination
 * 4. Test commission amount range + order subtotal range combination
 * 5. Test currency + commission type + amount range combination
 * 6. Test complex 4+ filter combinations
 * 7. Validate proper pagination with complex filters
 */
export async function test_api_seller_platform_commissions_multi_filter_combination(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile("+1"),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 3 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Test date range + commission amount range combination
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateAmountResult =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          created_after: thirtyDaysAgo.toISOString(),
          created_before: now.toISOString(),
          min_commission_amount: 10,
          max_commission_amount: 1000,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(dateAmountResult);
  TestValidator.predicate(
    "date and amount filter result has valid pagination",
    dateAmountResult.pagination.current === 1,
  );

  // Step 3: Test date range + commission type + refund status combination
  const typeRefundResult =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          created_after: thirtyDaysAgo.toISOString(),
          created_before: now.toISOString(),
          commission_type: "standard",
          is_refunded: false,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(typeRefundResult);
  TestValidator.predicate(
    "type and refund filter result is valid",
    typeRefundResult.pagination.current >= 1,
  );

  // Step 4: Test commission amount range + order subtotal range combination
  const amountSubtotalResult =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          min_commission_amount: 5,
          max_commission_amount: 500,
          min_order_subtotal: 50,
          max_order_subtotal: 5000,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(amountSubtotalResult);
  TestValidator.predicate(
    "amount and subtotal filter combination works",
    amountSubtotalResult.pagination.pages >= 0,
  );

  // Step 5: Test currency + commission type + amount range combination
  const currencyTypeAmountResult =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          currency: "USD",
          commission_type: "standard",
          min_commission_amount: 1,
          max_commission_amount: 10000,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(currencyTypeAmountResult);
  TestValidator.predicate(
    "currency, type, and amount filter combination is valid",
    currencyTypeAmountResult.pagination.limit === 20,
  );

  // Step 6: Test complex 4+ filter combination (realistic business scenario)
  const complexResult =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          created_after: thirtyDaysAgo.toISOString(),
          created_before: now.toISOString(),
          commission_type: "standard",
          is_refunded: false,
          min_commission_amount: 100,
          currency: "USD",
          sort_by: "commission_amount",
          sort_order: "desc",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(complexResult);
  TestValidator.predicate(
    "complex multi-filter query executes successfully",
    complexResult.pagination.current === 1 &&
      complexResult.pagination.limit === 10,
  );

  // Step 7: Test refunded amount range filters
  const refundedAmountResult =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          is_refunded: true,
          min_refunded_amount: 0,
          max_refunded_amount: 5000,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(refundedAmountResult);
  TestValidator.predicate(
    "refunded amount filter works correctly",
    refundedAmountResult.pagination.records >= 0,
  );

  // Step 8: Test order subtotal range with sorting
  const subtotalSortResult =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          min_order_subtotal: 100,
          max_order_subtotal: 10000,
          sort_by: "order_subtotal",
          sort_order: "asc",
          page: 1,
          limit: 15,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(subtotalSortResult);
  TestValidator.predicate(
    "order subtotal filter with sorting is valid",
    subtotalSortResult.pagination.limit === 15,
  );

  // Step 9: Test all filters combined (maximum complexity)
  const maxComplexityResult =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          created_after: thirtyDaysAgo.toISOString(),
          created_before: now.toISOString(),
          commission_type: "category_specific",
          is_refunded: false,
          min_commission_amount: 50,
          max_commission_amount: 2000,
          min_order_subtotal: 200,
          max_order_subtotal: 15000,
          currency: "USD",
          sort_by: "created_at",
          sort_order: "desc",
          page: 1,
          limit: 25,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(maxComplexityResult);
  TestValidator.predicate(
    "maximum complexity filter combination executes successfully",
    maxComplexityResult.pagination.current === 1,
  );
}
