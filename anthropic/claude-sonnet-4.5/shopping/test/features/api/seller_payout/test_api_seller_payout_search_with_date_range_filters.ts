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
 * Test that administrators can filter seller payouts by multiple date range
 * criteria.
 *
 * This test validates the date range filtering functionality for seller payout
 * searches, ensuring that administrators can accurately filter payouts by:
 *
 * - Settlement period dates (payout_date_from/to)
 * - Initiation timestamps (initiated_date_from/to)
 * - Completion timestamps (completed_date_from/to)
 *
 * The test creates multiple payout records with different dates spanning
 * various time periods and validates that each filter correctly restricts
 * results. It also verifies that date range boundaries are inclusive, combined
 * filters work correctly, and the API properly handles edge cases like payouts
 * with null timestamps.
 *
 * Test Steps:
 *
 * 1. Authenticate as admin user
 * 2. Create a seller account for payout records
 * 3. Create multiple payout records with different settlement periods and
 *    timestamps
 * 4. Test payout_date_from/to filtering (settlement period)
 * 5. Test initiated_date_from/to filtering
 * 6. Test completed_date_from/to filtering
 * 7. Test combined date filters
 * 8. Verify inclusive boundaries
 * 9. Validate null timestamp handling
 */
export async function test_api_seller_payout_search_with_date_range_filters(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin" as const,
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 3: Create multiple payout records with different dates
  const baseDate = new Date("2024-01-01T00:00:00Z");

  // Payout 1: January period, initiated early, completed mid-January
  const payout1 = await api.functional.shoppingMall.admin.sellerPayouts.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: seller.id,
        payout_period_start: new Date("2024-01-01T00:00:00Z").toISOString(),
        payout_period_end: new Date("2024-01-15T23:59:59Z").toISOString(),
        gross_amount: 1000,
        commission_amount: 100,
        refund_amount: 0,
        adjustment_amount: 0,
        net_payout_amount: 900,
        currency: "USD",
        status: "completed",
        bank_account_last_four: "1234",
        bank_name: "Test Bank",
        transfer_reference: "TXN001",
        initiated_at: new Date("2024-01-16T10:00:00Z").toISOString(),
        completed_at: new Date("2024-01-18T15:30:00Z").toISOString(),
      } satisfies IShoppingMallSellerPayout.ICreate,
    },
  );
  typia.assert(payout1);

  // Payout 2: February period, initiated late, completed early March
  const payout2 = await api.functional.shoppingMall.admin.sellerPayouts.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: seller.id,
        payout_period_start: new Date("2024-02-01T00:00:00Z").toISOString(),
        payout_period_end: new Date("2024-02-29T23:59:59Z").toISOString(),
        gross_amount: 2000,
        commission_amount: 200,
        refund_amount: 50,
        adjustment_amount: 0,
        net_payout_amount: 1750,
        currency: "USD",
        status: "completed",
        bank_account_last_four: "5678",
        bank_name: "Test Bank",
        transfer_reference: "TXN002",
        initiated_at: new Date("2024-03-01T14:00:00Z").toISOString(),
        completed_at: new Date("2024-03-05T11:20:00Z").toISOString(),
      } satisfies IShoppingMallSellerPayout.ICreate,
    },
  );
  typia.assert(payout2);

  // Payout 3: March period, initiated mid-March, not yet completed (null completed_at)
  const payout3 = await api.functional.shoppingMall.admin.sellerPayouts.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: seller.id,
        payout_period_start: new Date("2024-03-01T00:00:00Z").toISOString(),
        payout_period_end: new Date("2024-03-31T23:59:59Z").toISOString(),
        gross_amount: 1500,
        commission_amount: 150,
        refund_amount: 0,
        adjustment_amount: 50,
        net_payout_amount: 1400,
        currency: "USD",
        status: "processing",
        bank_account_last_four: "9012",
        bank_name: "Test Bank",
        transfer_reference: "TXN003",
        initiated_at: new Date("2024-04-01T09:00:00Z").toISOString(),
        completed_at: null,
      } satisfies IShoppingMallSellerPayout.ICreate,
    },
  );
  typia.assert(payout3);

  // Payout 4: April period, pending (null initiated_at and completed_at)
  const payout4 = await api.functional.shoppingMall.admin.sellerPayouts.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: seller.id,
        payout_period_start: new Date("2024-04-01T00:00:00Z").toISOString(),
        payout_period_end: new Date("2024-04-30T23:59:59Z").toISOString(),
        gross_amount: 3000,
        commission_amount: 300,
        refund_amount: 100,
        adjustment_amount: -50,
        net_payout_amount: 2550,
        currency: "USD",
        status: "pending",
        bank_account_last_four: null,
        bank_name: null,
        transfer_reference: null,
        initiated_at: null,
        completed_at: null,
      } satisfies IShoppingMallSellerPayout.ICreate,
    },
  );
  typia.assert(payout4);

  // Step 4: Test payout_date_from/to filtering (settlement period)
  const januaryPayouts =
    await api.functional.shoppingMall.admin.sellerPayouts.index(connection, {
      body: {
        seller_id: seller.id,
        payout_date_from: new Date("2024-01-01T00:00:00Z").toISOString(),
        payout_date_to: new Date("2024-01-31T23:59:59Z").toISOString(),
      } satisfies IShoppingMallSellerPayout.IRequest,
    });
  typia.assert(januaryPayouts);
  TestValidator.equals(
    "January settlement period filter should return payout1",
    januaryPayouts.data.length,
    1,
  );
  TestValidator.equals(
    "Returned payout should be payout1",
    januaryPayouts.data[0].id,
    payout1.id,
  );

  // Test February payouts
  const februaryPayouts =
    await api.functional.shoppingMall.admin.sellerPayouts.index(connection, {
      body: {
        seller_id: seller.id,
        payout_date_from: new Date("2024-02-01T00:00:00Z").toISOString(),
        payout_date_to: new Date("2024-02-29T23:59:59Z").toISOString(),
      } satisfies IShoppingMallSellerPayout.IRequest,
    });
  typia.assert(februaryPayouts);
  TestValidator.equals(
    "February settlement period filter should return payout2",
    februaryPayouts.data.length,
    1,
  );
  TestValidator.equals(
    "Returned payout should be payout2",
    februaryPayouts.data[0].id,
    payout2.id,
  );

  // Test Q1 payouts (Jan-March inclusive)
  const q1Payouts = await api.functional.shoppingMall.admin.sellerPayouts.index(
    connection,
    {
      body: {
        seller_id: seller.id,
        payout_date_from: new Date("2024-01-01T00:00:00Z").toISOString(),
        payout_date_to: new Date("2024-03-31T23:59:59Z").toISOString(),
      } satisfies IShoppingMallSellerPayout.IRequest,
    },
  );
  typia.assert(q1Payouts);
  TestValidator.equals(
    "Q1 settlement period filter should return 3 payouts",
    q1Payouts.data.length,
    3,
  );

  // Step 5: Test initiated_date_from/to filtering
  const midJanuaryInitiated =
    await api.functional.shoppingMall.admin.sellerPayouts.index(connection, {
      body: {
        seller_id: seller.id,
        initiated_date_from: new Date("2024-01-15T00:00:00Z").toISOString(),
        initiated_date_to: new Date("2024-01-31T23:59:59Z").toISOString(),
      } satisfies IShoppingMallSellerPayout.IRequest,
    });
  typia.assert(midJanuaryInitiated);
  TestValidator.equals(
    "Mid-January initiation filter should return payout1",
    midJanuaryInitiated.data.length,
    1,
  );
  TestValidator.equals(
    "Returned payout should be payout1",
    midJanuaryInitiated.data[0].id,
    payout1.id,
  );

  // Test March initiated payouts
  const marchInitiated =
    await api.functional.shoppingMall.admin.sellerPayouts.index(connection, {
      body: {
        seller_id: seller.id,
        initiated_date_from: new Date("2024-03-01T00:00:00Z").toISOString(),
        initiated_date_to: new Date("2024-03-31T23:59:59Z").toISOString(),
      } satisfies IShoppingMallSellerPayout.IRequest,
    });
  typia.assert(marchInitiated);
  TestValidator.equals(
    "March initiation filter should return payout2",
    marchInitiated.data.length,
    1,
  );
  TestValidator.equals(
    "Returned payout should be payout2",
    marchInitiated.data[0].id,
    payout2.id,
  );

  // Step 6: Test completed_date_from/to filtering
  const januaryCompleted =
    await api.functional.shoppingMall.admin.sellerPayouts.index(connection, {
      body: {
        seller_id: seller.id,
        completed_date_from: new Date("2024-01-01T00:00:00Z").toISOString(),
        completed_date_to: new Date("2024-01-31T23:59:59Z").toISOString(),
      } satisfies IShoppingMallSellerPayout.IRequest,
    });
  typia.assert(januaryCompleted);
  TestValidator.equals(
    "January completion filter should return payout1",
    januaryCompleted.data.length,
    1,
  );
  TestValidator.equals(
    "Returned payout should be payout1",
    januaryCompleted.data[0].id,
    payout1.id,
  );

  // Test March completed payouts
  const marchCompleted =
    await api.functional.shoppingMall.admin.sellerPayouts.index(connection, {
      body: {
        seller_id: seller.id,
        completed_date_from: new Date("2024-03-01T00:00:00Z").toISOString(),
        completed_date_to: new Date("2024-03-31T23:59:59Z").toISOString(),
      } satisfies IShoppingMallSellerPayout.IRequest,
    });
  typia.assert(marchCompleted);
  TestValidator.equals(
    "March completion filter should return payout2",
    marchCompleted.data.length,
    1,
  );
  TestValidator.equals(
    "Returned payout should be payout2",
    marchCompleted.data[0].id,
    payout2.id,
  );

  // Step 7: Test combined date filters
  const combinedFilters =
    await api.functional.shoppingMall.admin.sellerPayouts.index(connection, {
      body: {
        seller_id: seller.id,
        payout_date_from: new Date("2024-01-01T00:00:00Z").toISOString(),
        payout_date_to: new Date("2024-02-29T23:59:59Z").toISOString(),
        initiated_date_from: new Date("2024-01-01T00:00:00Z").toISOString(),
        initiated_date_to: new Date("2024-03-31T23:59:59Z").toISOString(),
        completed_date_from: new Date("2024-01-01T00:00:00Z").toISOString(),
        completed_date_to: new Date("2024-03-31T23:59:59Z").toISOString(),
      } satisfies IShoppingMallSellerPayout.IRequest,
    });
  typia.assert(combinedFilters);
  TestValidator.equals(
    "Combined filters should return 2 completed payouts",
    combinedFilters.data.length,
    2,
  );

  // Step 8: Verify inclusive boundaries - test exact boundary dates
  const boundaryTest =
    await api.functional.shoppingMall.admin.sellerPayouts.index(connection, {
      body: {
        seller_id: seller.id,
        payout_date_from: new Date("2024-01-01T00:00:00Z").toISOString(),
        payout_date_to: new Date("2024-01-15T23:59:59Z").toISOString(),
      } satisfies IShoppingMallSellerPayout.IRequest,
    });
  typia.assert(boundaryTest);
  TestValidator.predicate(
    "Boundary test should include payout1 (inclusive boundaries)",
    boundaryTest.data.length >= 1,
  );

  // Step 9: Test all payouts without filters
  const allPayouts =
    await api.functional.shoppingMall.admin.sellerPayouts.index(connection, {
      body: {
        seller_id: seller.id,
      } satisfies IShoppingMallSellerPayout.IRequest,
    });
  typia.assert(allPayouts);
  TestValidator.equals(
    "Should return all 4 payouts when no date filters applied",
    allPayouts.data.length,
    4,
  );
}
