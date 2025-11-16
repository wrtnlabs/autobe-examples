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
 * Test commission amount range filtering using min_commission_amount and
 * max_commission_amount parameters.
 *
 * This test validates that the commission filtering API correctly returns
 * commission records within specified monetary value ranges. It tests filtering
 * with only minimum threshold, only maximum threshold, and both together to
 * define specific value bands.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a seller account
 * 2. Retrieve all commission records for the seller
 * 3. Test minimum commission amount filtering
 * 4. Test maximum commission amount filtering
 * 5. Test combined min and max commission amount filtering
 * 6. Verify boundary value handling
 */
export async function test_api_seller_platform_commissions_amount_range_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate seller account
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile("+82"),
    business_name: RandomGenerator.name(2),
    business_description: RandomGenerator.paragraph({ sentences: 5 }),
    store_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
  typia.assert(seller);

  // Step 2: Retrieve all commission records for baseline
  const allCommissionsPage: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(allCommissionsPage);

  // If there are commission records, test filtering
  if (allCommissionsPage.data.length > 0) {
    const commissions = allCommissionsPage.data;

    // Find minimum and maximum commission amounts for testing
    const amounts = commissions.map((c) => c.commission_amount);
    const minAmount = Math.min(...amounts);
    const maxAmount = Math.max(...amounts);
    const midAmount = (minAmount + maxAmount) / 2;

    // Step 3: Test minimum commission amount filtering
    const minFilteredPage: IPageIShoppingMallPlatformCommission.ISummary =
      await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
        connection,
        {
          sellerId: seller.id,
          body: {
            page: 1,
            limit: 100,
            min_commission_amount: midAmount,
          } satisfies IShoppingMallPlatformCommission.IRequest,
        },
      );
    typia.assert(minFilteredPage);

    // Verify all returned commissions are >= minimum threshold
    for (const commission of minFilteredPage.data) {
      TestValidator.predicate(
        "commission amount should be >= minimum threshold",
        commission.commission_amount >= midAmount,
      );
    }

    // Step 4: Test maximum commission amount filtering
    const maxFilteredPage: IPageIShoppingMallPlatformCommission.ISummary =
      await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
        connection,
        {
          sellerId: seller.id,
          body: {
            page: 1,
            limit: 100,
            max_commission_amount: midAmount,
          } satisfies IShoppingMallPlatformCommission.IRequest,
        },
      );
    typia.assert(maxFilteredPage);

    // Verify all returned commissions are <= maximum threshold
    for (const commission of maxFilteredPage.data) {
      TestValidator.predicate(
        "commission amount should be <= maximum threshold",
        commission.commission_amount <= midAmount,
      );
    }

    // Step 5: Test combined min and max commission amount filtering
    const lowerBound = minAmount + (maxAmount - minAmount) * 0.25;
    const upperBound = minAmount + (maxAmount - minAmount) * 0.75;

    const rangeFilteredPage: IPageIShoppingMallPlatformCommission.ISummary =
      await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
        connection,
        {
          sellerId: seller.id,
          body: {
            page: 1,
            limit: 100,
            min_commission_amount: lowerBound,
            max_commission_amount: upperBound,
          } satisfies IShoppingMallPlatformCommission.IRequest,
        },
      );
    typia.assert(rangeFilteredPage);

    // Verify all returned commissions are within the specified range
    for (const commission of rangeFilteredPage.data) {
      TestValidator.predicate(
        "commission amount should be within specified range",
        commission.commission_amount >= lowerBound &&
          commission.commission_amount <= upperBound,
      );
    }

    // Step 6: Test boundary values - exact minimum
    const exactMinPage: IPageIShoppingMallPlatformCommission.ISummary =
      await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
        connection,
        {
          sellerId: seller.id,
          body: {
            page: 1,
            limit: 100,
            min_commission_amount: minAmount,
            max_commission_amount: minAmount,
          } satisfies IShoppingMallPlatformCommission.IRequest,
        },
      );
    typia.assert(exactMinPage);

    // Verify boundary handling - commissions exactly at minimum should be included
    for (const commission of exactMinPage.data) {
      TestValidator.equals(
        "exact boundary amount should be included",
        commission.commission_amount,
        minAmount,
      );
    }

    // Step 7: Test with zero minimum amount
    const zeroMinPage: IPageIShoppingMallPlatformCommission.ISummary =
      await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
        connection,
        {
          sellerId: seller.id,
          body: {
            page: 1,
            limit: 100,
            min_commission_amount: 0,
          } satisfies IShoppingMallPlatformCommission.IRequest,
        },
      );
    typia.assert(zeroMinPage);

    // All commissions should have non-negative amounts
    for (const commission of zeroMinPage.data) {
      TestValidator.predicate(
        "commission amount should be non-negative",
        commission.commission_amount >= 0,
      );
    }

    // Step 8: Test with very large amount value - should return no or few results
    const veryLargeAmount = maxAmount * 1000;
    const largeAmountPage: IPageIShoppingMallPlatformCommission.ISummary =
      await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
        connection,
        {
          sellerId: seller.id,
          body: {
            page: 1,
            limit: 100,
            min_commission_amount: veryLargeAmount,
          } satisfies IShoppingMallPlatformCommission.IRequest,
        },
      );
    typia.assert(largeAmountPage);

    // Should return empty or minimal results
    TestValidator.predicate(
      "very large minimum amount should return few or no results",
      largeAmountPage.data.length === 0 ||
        largeAmountPage.data.every(
          (c) => c.commission_amount >= veryLargeAmount,
        ),
    );
  } else {
    // No commission records exist - test that empty filtering works correctly
    const emptyFilterPage: IPageIShoppingMallPlatformCommission.ISummary =
      await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
        connection,
        {
          sellerId: seller.id,
          body: {
            page: 1,
            limit: 100,
            min_commission_amount: 0,
            max_commission_amount: 1000000,
          } satisfies IShoppingMallPlatformCommission.IRequest,
        },
      );
    typia.assert(emptyFilterPage);

    TestValidator.equals(
      "no matching records should return empty data array",
      emptyFilterPage.data.length,
      0,
    );
  }
}
