import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

/**
 * Test that only administrators can create seller payout transactions and that
 * proper authorization is enforced.
 *
 * This test validates the authorization boundaries for payout creation by:
 *
 * 1. Creating an admin account and authenticating
 * 2. Creating a seller account for use as payout recipient
 * 3. Verifying admin can successfully create seller payouts
 * 4. Switching to seller authentication context
 * 5. Verifying seller cannot create their own payouts (authorization failure)
 *
 * This ensures financial security by preventing unauthorized payout creation.
 */
export async function test_api_seller_payout_creation_authorization(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
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

  // Store admin token for later use
  const adminToken = admin.token.access;

  // Step 2: Create a seller account to use as payout recipient
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
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

  // Store seller token
  const sellerToken = seller.token.access;

  // Step 3: Switch back to admin authentication and create a payout
  connection.headers = connection.headers || {};
  connection.headers.Authorization = adminToken;

  const payoutPeriodStart = new Date();
  const payoutPeriodEnd = new Date(
    payoutPeriodStart.getTime() + 30 * 24 * 60 * 60 * 1000,
  );

  const grossAmount = 10000;
  const commissionAmount = 1000;
  const refundAmount = 500;
  const adjustmentAmount = 0;
  const netPayoutAmount =
    grossAmount - commissionAmount - refundAmount + adjustmentAmount;

  const payoutData = {
    shopping_mall_seller_id: seller.id,
    payout_period_start: payoutPeriodStart.toISOString(),
    payout_period_end: payoutPeriodEnd.toISOString(),
    gross_amount: grossAmount,
    commission_amount: commissionAmount,
    refund_amount: refundAmount,
    adjustment_amount: adjustmentAmount,
    net_payout_amount: netPayoutAmount,
    currency: "USD",
    status: "pending",
    bank_account_last_four: "1234",
    bank_name: "Test Bank",
    notes: "Automated test payout",
  } satisfies IShoppingMallSellerPayout.ICreate;

  // Admin should successfully create payout
  const adminPayout: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.create(connection, {
      body: payoutData,
    });
  typia.assert(adminPayout);

  // Validate payout was created correctly
  TestValidator.equals(
    "payout seller ID matches",
    adminPayout.shopping_mall_seller_id,
    seller.id,
  );
  TestValidator.equals(
    "payout gross amount matches",
    adminPayout.gross_amount,
    grossAmount,
  );
  TestValidator.equals(
    "payout net amount matches",
    adminPayout.net_payout_amount,
    netPayoutAmount,
  );
  TestValidator.equals(
    "payout status is pending",
    adminPayout.status,
    "pending",
  );

  // Step 4: Switch to seller authentication and attempt to create payout
  connection.headers.Authorization = sellerToken;

  // Step 5: Seller should NOT be able to create payout (authorization error expected)
  await TestValidator.error(
    "seller cannot create payout - authorization required",
    async () => {
      await api.functional.shoppingMall.admin.sellerPayouts.create(connection, {
        body: {
          shopping_mall_seller_id: seller.id,
          payout_period_start: new Date().toISOString(),
          payout_period_end: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          gross_amount: 5000,
          commission_amount: 500,
          refund_amount: 0,
          adjustment_amount: 0,
          net_payout_amount: 4500,
          currency: "USD",
          status: "pending",
        } satisfies IShoppingMallSellerPayout.ICreate,
      });
    },
  );
}
