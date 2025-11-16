import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPayout";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

/**
 * Test that administrators can filter seller payouts by net payout amount
 * thresholds to find payouts within specific financial ranges.
 *
 * This test validates the min_amount and max_amount filtering functionality for
 * seller payouts, ensuring administrators can perform revenue analysis and
 * identify unusual payout patterns based on settlement amounts.
 *
 * Test flow:
 *
 * 1. Authenticate as administrator
 * 2. Create a seller account for payout association
 * 3. Create multiple payouts with different net amounts (small, medium, large)
 * 4. Test min_amount filter to find payouts above threshold
 * 5. Test max_amount filter to find payouts below threshold
 * 6. Test combined min and max filters for range queries
 * 7. Verify boundary values are handled correctly (inclusive ranges)
 */
export async function test_api_seller_payout_search_with_amount_range_filters(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  await api.functional.auth.admin.join(connection, {
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

  // Step 2: Create seller account for payout association
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 3 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 3: Create payouts with varying net amounts for testing
  const now = new Date();
  const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Create small payout ($100)
  const smallPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.create(connection, {
      body: {
        shopping_mall_seller_id: seller.id,
        payout_period_start: periodStart.toISOString(),
        payout_period_end: now.toISOString(),
        gross_amount: 120,
        commission_amount: 20,
        refund_amount: 0,
        adjustment_amount: 0,
        net_payout_amount: 100,
        currency: "USD",
        status: "completed",
      } satisfies IShoppingMallSellerPayout.ICreate,
    });
  typia.assert(smallPayout);

  // Create medium payout ($500)
  const mediumPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.create(connection, {
      body: {
        shopping_mall_seller_id: seller.id,
        payout_period_start: periodStart.toISOString(),
        payout_period_end: now.toISOString(),
        gross_amount: 600,
        commission_amount: 100,
        refund_amount: 0,
        adjustment_amount: 0,
        net_payout_amount: 500,
        currency: "USD",
        status: "completed",
      } satisfies IShoppingMallSellerPayout.ICreate,
    });
  typia.assert(mediumPayout);

  // Create large payout ($5000)
  const largePayout =
    await api.functional.shoppingMall.admin.sellerPayouts.create(connection, {
      body: {
        shopping_mall_seller_id: seller.id,
        payout_period_start: periodStart.toISOString(),
        payout_period_end: now.toISOString(),
        gross_amount: 6000,
        commission_amount: 1000,
        refund_amount: 0,
        adjustment_amount: 0,
        net_payout_amount: 5000,
        currency: "USD",
        status: "completed",
      } satisfies IShoppingMallSellerPayout.ICreate,
    });
  typia.assert(largePayout);

  // Create boundary test payout ($1000)
  const boundaryPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.create(connection, {
      body: {
        shopping_mall_seller_id: seller.id,
        payout_period_start: periodStart.toISOString(),
        payout_period_end: now.toISOString(),
        gross_amount: 1200,
        commission_amount: 200,
        refund_amount: 0,
        adjustment_amount: 0,
        net_payout_amount: 1000,
        currency: "USD",
        status: "completed",
      } satisfies IShoppingMallSellerPayout.ICreate,
    });
  typia.assert(boundaryPayout);

  // Step 4: Test min_amount filter - payouts >= 500
  const minAmountResults =
    await api.functional.shoppingMall.admin.sellerPayouts.index(connection, {
      body: {
        seller_id: seller.id,
        min_amount: 500,
      } satisfies IShoppingMallSellerPayout.IRequest,
    });
  typia.assert(minAmountResults);

  TestValidator.predicate(
    "min_amount filter returns correct count",
    minAmountResults.data.length === 3,
  );

  const minAmountValues = minAmountResults.data.map((p) => p.net_payout_amount);
  TestValidator.predicate(
    "all payouts meet minimum amount threshold",
    minAmountValues.every((amount) => amount >= 500),
  );

  // Step 5: Test max_amount filter - payouts <= 1000
  const maxAmountResults =
    await api.functional.shoppingMall.admin.sellerPayouts.index(connection, {
      body: {
        seller_id: seller.id,
        max_amount: 1000,
      } satisfies IShoppingMallSellerPayout.IRequest,
    });
  typia.assert(maxAmountResults);

  TestValidator.predicate(
    "max_amount filter returns correct count",
    maxAmountResults.data.length === 3,
  );

  const maxAmountValues = maxAmountResults.data.map((p) => p.net_payout_amount);
  TestValidator.predicate(
    "all payouts meet maximum amount threshold",
    maxAmountValues.every((amount) => amount <= 1000),
  );

  // Step 6: Test combined min and max filters - payouts between 500 and 1000
  const rangeResults =
    await api.functional.shoppingMall.admin.sellerPayouts.index(connection, {
      body: {
        seller_id: seller.id,
        min_amount: 500,
        max_amount: 1000,
      } satisfies IShoppingMallSellerPayout.IRequest,
    });
  typia.assert(rangeResults);

  TestValidator.predicate(
    "range filter returns correct count",
    rangeResults.data.length === 2,
  );

  const rangeValues = rangeResults.data.map((p) => p.net_payout_amount);
  TestValidator.predicate(
    "all payouts are within the specified range",
    rangeValues.every((amount) => amount >= 500 && amount <= 1000),
  );

  // Step 7: Verify boundary values are inclusive
  const boundaryCheck = rangeResults.data.find(
    (p) => p.id === boundaryPayout.id,
  );
  TestValidator.predicate(
    "boundary value 1000 is included in range filter",
    boundaryCheck !== undefined,
  );

  const mediumCheck = rangeResults.data.find((p) => p.id === mediumPayout.id);
  TestValidator.predicate(
    "boundary value 500 is included in range filter",
    mediumCheck !== undefined,
  );

  // Step 8: Test filtering out small payouts
  const largePayoutsOnly =
    await api.functional.shoppingMall.admin.sellerPayouts.index(connection, {
      body: {
        seller_id: seller.id,
        min_amount: 1000,
      } satisfies IShoppingMallSellerPayout.IRequest,
    });
  typia.assert(largePayoutsOnly);

  TestValidator.predicate(
    "large payouts filter excludes small amounts",
    largePayoutsOnly.data.every((p) => p.net_payout_amount >= 1000),
  );

  TestValidator.predicate(
    "small payout is excluded from large payouts filter",
    !largePayoutsOnly.data.some((p) => p.id === smallPayout.id),
  );
}
