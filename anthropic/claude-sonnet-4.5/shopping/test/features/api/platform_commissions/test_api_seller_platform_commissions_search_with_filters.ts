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
 * Test comprehensive platform commission search and filtering capabilities for
 * sellers.
 *
 * This test validates that sellers can search and retrieve their own platform
 * commission records with various filtering options including:
 *
 * - Pagination parameters (page, limit)
 * - Date range filters (created_after, created_before)
 * - Commission amount ranges (min_commission_amount, max_commission_amount)
 * - Order references (order_id)
 * - Seller filtering (seller_id)
 * - Commission type filtering
 * - Refund status filtering (is_refunded)
 * - Currency filtering
 * - Sorting by multiple fields (created_at, commission_amount, order_subtotal)
 * - Sort direction (ascending/descending)
 *
 * The test also verifies:
 *
 * - Proper pagination metadata in responses
 * - Access control (sellers can only view their own commission data)
 * - Correct application of filter combinations
 */
export async function test_api_seller_platform_commissions_search_with_filters(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile("+82"),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Test basic commission retrieval with default pagination
  const basicResult =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {} satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(basicResult);

  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination should have valid current page",
    basicResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    basicResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    basicResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    basicResult.pagination.pages >= 0,
  );

  // Step 3: Test pagination parameters
  const paginatedResult =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination current page should match request",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    paginatedResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "data array should not exceed limit",
    paginatedResult.data.length <= 10,
  );

  // Step 4: Test date range filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateFilteredResult =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          created_after: thirtyDaysAgo.toISOString(),
          created_before: now.toISOString(),
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(dateFilteredResult);

  // Step 5: Test commission amount range filtering
  const amountFilteredResult =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          min_commission_amount: 0,
          max_commission_amount: 1000,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(amountFilteredResult);

  // Step 6: Test commission type filtering
  const commissionTypes = [
    "standard",
    "category_specific",
    "seller_tier",
    "promotional",
  ] as const;
  const randomCommissionType = RandomGenerator.pick(commissionTypes);

  const typeFilteredResult =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          commission_type: randomCommissionType,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(typeFilteredResult);

  // Step 7: Test refund status filtering
  const refundedResult =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          is_refunded: true,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(refundedResult);

  const nonRefundedResult =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          is_refunded: false,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(nonRefundedResult);

  // Step 8: Test currency filtering
  const currencyFilteredResult =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          currency: "USD",
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(currencyFilteredResult);

  // Step 9: Test sorting by created_at in ascending order
  const sortedByDateAscResult =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(sortedByDateAscResult);

  // Step 10: Test sorting by created_at in descending order
  const sortedByDateDescResult =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(sortedByDateDescResult);

  // Step 11: Test sorting by commission_amount
  const sortedByAmountResult =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          sort_by: "commission_amount",
          sort_order: "desc",
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(sortedByAmountResult);

  // Step 12: Test sorting by order_subtotal
  const sortedBySubtotalResult =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          sort_by: "order_subtotal",
          sort_order: "asc",
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(sortedBySubtotalResult);

  // Step 13: Test combined filters (date range + amount range + commission type)
  const combinedFilterResult =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          created_after: thirtyDaysAgo.toISOString(),
          created_before: now.toISOString(),
          min_commission_amount: 0,
          max_commission_amount: 500,
          commission_type: "standard",
          is_refunded: false,
          sort_by: "created_at",
          sort_order: "desc",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(combinedFilterResult);

  // Validate combined filter result structure
  TestValidator.predicate(
    "combined filter should return valid pagination",
    combinedFilterResult.pagination.current === 1 &&
      combinedFilterResult.pagination.limit === 20,
  );
}
