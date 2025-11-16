import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

/**
 * Test seller payout retrieval authorization boundaries.
 *
 * Validates that sellers can only retrieve their own payout records and cannot
 * access payouts belonging to other sellers, while administrators can retrieve
 * any payout for oversight purposes. This test creates multiple seller accounts
 * each with their own payouts, then validates proper authorization enforcement
 * and data isolation in the payout system.
 *
 * Steps:
 *
 * 1. Create Seller A account and authenticate
 * 2. Create Seller B account and authenticate
 * 3. Create admin account and authenticate
 * 4. Create payout for Seller A
 * 5. Create payout for Seller B
 * 6. Authenticate as Seller A and retrieve own payout (should succeed)
 * 7. While as Seller A, attempt to retrieve Seller B's payout (should fail)
 * 8. Authenticate as admin and retrieve Seller A's payout (should succeed)
 * 9. While as admin, retrieve Seller B's payout (should succeed)
 * 10. Authenticate as Seller B and retrieve own payout (should succeed)
 * 11. While as Seller B, attempt to retrieve Seller A's payout (should fail)
 */
export async function test_api_seller_payout_retrieval_authorization(
  connection: api.IConnection,
) {
  // Store passwords for reuse in login operations
  const sellerAPassword = typia.random<string & tags.MinLength<8>>();
  const sellerBPassword = typia.random<string & tags.MinLength<8>>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  // Step 1: Create Seller A account
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerA = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(sellerA);

  // Step 2: Create Seller B account
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerB = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(sellerB);

  // Step 3: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 4: Create payout for Seller A (as admin)
  const payoutPeriodStart = new Date();
  const payoutPeriodEnd = new Date(
    payoutPeriodStart.getTime() + 30 * 24 * 60 * 60 * 1000,
  );

  const grossAmount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>
  >();
  const commissionAmount = grossAmount * 0.15;
  const refundAmount = typia.random<
    number & tags.Type<"uint32"> & tags.Maximum<1000>
  >();
  const adjustmentAmount = 0;
  const netPayoutAmountA =
    grossAmount - commissionAmount - refundAmount + adjustmentAmount;

  const payoutA = await api.functional.shoppingMall.admin.sellerPayouts.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerA.id,
        payout_period_start: payoutPeriodStart.toISOString(),
        payout_period_end: payoutPeriodEnd.toISOString(),
        gross_amount: grossAmount,
        commission_amount: commissionAmount,
        refund_amount: refundAmount,
        adjustment_amount: adjustmentAmount,
        net_payout_amount: netPayoutAmountA,
        currency: "USD",
        status: "pending",
        bank_account_last_four: "1234",
        bank_name: "Test Bank A",
      } satisfies IShoppingMallSellerPayout.ICreate,
    },
  );
  typia.assert(payoutA);

  // Step 5: Create payout for Seller B (as admin)
  const grossAmountB = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>
  >();
  const commissionAmountB = grossAmountB * 0.15;
  const refundAmountB = typia.random<
    number & tags.Type<"uint32"> & tags.Maximum<1000>
  >();
  const adjustmentAmountB = 0;
  const netPayoutAmountB =
    grossAmountB - commissionAmountB - refundAmountB + adjustmentAmountB;

  const payoutB = await api.functional.shoppingMall.admin.sellerPayouts.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerB.id,
        payout_period_start: payoutPeriodStart.toISOString(),
        payout_period_end: payoutPeriodEnd.toISOString(),
        gross_amount: grossAmountB,
        commission_amount: commissionAmountB,
        refund_amount: refundAmountB,
        adjustment_amount: adjustmentAmountB,
        net_payout_amount: netPayoutAmountB,
        currency: "USD",
        status: "pending",
        bank_account_last_four: "5678",
        bank_name: "Test Bank B",
      } satisfies IShoppingMallSellerPayout.ICreate,
    },
  );
  typia.assert(payoutB);

  // Step 6: Authenticate as Seller A and retrieve own payout
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const retrievedPayoutA =
    await api.functional.shoppingMall.seller.sellerPayouts.at(connection, {
      payoutId: payoutA.id,
    });
  typia.assert(retrievedPayoutA);
  TestValidator.equals(
    "seller A can retrieve own payout",
    retrievedPayoutA.id,
    payoutA.id,
  );
  TestValidator.equals(
    "retrieved payout belongs to seller A",
    retrievedPayoutA.shopping_mall_seller_id,
    sellerA.id,
  );

  // Step 7: While as Seller A, attempt to retrieve Seller B's payout (should fail)
  await TestValidator.error(
    "seller A cannot retrieve seller B's payout",
    async () => {
      await api.functional.shoppingMall.seller.sellerPayouts.at(connection, {
        payoutId: payoutB.id,
      });
    },
  );

  // Step 8: Authenticate as admin and retrieve Seller A's payout
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });

  const adminRetrievedPayoutA =
    await api.functional.shoppingMall.seller.sellerPayouts.at(connection, {
      payoutId: payoutA.id,
    });
  typia.assert(adminRetrievedPayoutA);
  TestValidator.equals(
    "admin can retrieve seller A's payout",
    adminRetrievedPayoutA.id,
    payoutA.id,
  );

  // Step 9: While as admin, retrieve Seller B's payout
  const adminRetrievedPayoutB =
    await api.functional.shoppingMall.seller.sellerPayouts.at(connection, {
      payoutId: payoutB.id,
    });
  typia.assert(adminRetrievedPayoutB);
  TestValidator.equals(
    "admin can retrieve seller B's payout",
    adminRetrievedPayoutB.id,
    payoutB.id,
  );

  // Step 10: Authenticate as Seller B and retrieve own payout
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const retrievedPayoutB =
    await api.functional.shoppingMall.seller.sellerPayouts.at(connection, {
      payoutId: payoutB.id,
    });
  typia.assert(retrievedPayoutB);
  TestValidator.equals(
    "seller B can retrieve own payout",
    retrievedPayoutB.id,
    payoutB.id,
  );
  TestValidator.equals(
    "retrieved payout belongs to seller B",
    retrievedPayoutB.shopping_mall_seller_id,
    sellerB.id,
  );

  // Step 11: While as Seller B, attempt to retrieve Seller A's payout (should fail)
  await TestValidator.error(
    "seller B cannot retrieve seller A's payout",
    async () => {
      await api.functional.shoppingMall.seller.sellerPayouts.at(connection, {
        payoutId: payoutA.id,
      });
    },
  );
}
