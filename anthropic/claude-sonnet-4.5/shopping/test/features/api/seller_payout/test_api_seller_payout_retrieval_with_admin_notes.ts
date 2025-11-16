import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

/**
 * Test that payout retrieval includes administrative notes documenting special
 * circumstances or manual adjustments.
 *
 * This test validates the transparency mechanism where sellers can view
 * administrative explanations for payout modifications, manual interventions,
 * or special handling. The scenario creates a payout with adjustment_amount and
 * corresponding notes, then verifies sellers can see these explanations.
 *
 * Test Flow:
 *
 * 1. Create and authenticate seller account
 * 2. Create and authenticate admin account
 * 3. Admin creates payout with adjustment and explanatory notes
 * 4. Switch to seller authentication
 * 5. Seller retrieves payout and validates notes are present
 * 6. Verify adjustment amount and administrative transparency
 */
export async function test_api_seller_payout_retrieval_with_admin_notes(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 3,
        wordMax: 7,
      }),
      business_description: RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 10,
        sentenceMax: 15,
      }),
      store_name: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 3,
        wordMax: 6,
      }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin" as const,
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 3: Admin creates payout with adjustment and notes
  const payoutPeriodStart = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const payoutPeriodEnd = new Date().toISOString();
  const grossAmount = 5000;
  const commissionAmount = 500;
  const refundAmount = 200;
  const adjustmentAmount = -150;
  const netPayoutAmount =
    grossAmount - commissionAmount - refundAmount + adjustmentAmount;
  const adminNotes =
    "Manual adjustment applied due to promotional credit refund for merchant partnership program. Deducted $150 as agreed in partnership terms.";

  const createdPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.create(connection, {
      body: {
        shopping_mall_seller_id: seller.id,
        payout_period_start: payoutPeriodStart,
        payout_period_end: payoutPeriodEnd,
        gross_amount: grossAmount,
        commission_amount: commissionAmount,
        refund_amount: refundAmount,
        adjustment_amount: adjustmentAmount,
        net_payout_amount: netPayoutAmount,
        currency: "USD",
        status: "pending",
        bank_account_last_four: "1234",
        bank_name: "Test Bank",
        notes: adminNotes,
      } satisfies IShoppingMallSellerPayout.ICreate,
    });
  typia.assert(createdPayout);

  // Step 4: Switch to seller authentication
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 5: Seller retrieves payout
  const retrievedPayout =
    await api.functional.shoppingMall.seller.sellerPayouts.at(connection, {
      payoutId: createdPayout.id,
    });
  typia.assert(retrievedPayout);

  // Step 6: Validate administrative notes are present and accessible
  TestValidator.equals(
    "payout ID matches",
    retrievedPayout.id,
    createdPayout.id,
  );
  TestValidator.equals(
    "adjustment amount is correct",
    retrievedPayout.adjustment_amount,
    adjustmentAmount,
  );
  TestValidator.equals(
    "net payout amount is correct",
    retrievedPayout.net_payout_amount,
    netPayoutAmount,
  );
  TestValidator.equals(
    "seller ID matches",
    retrievedPayout.shopping_mall_seller_id,
    seller.id,
  );

  // Validate administrative notes with proper null handling
  TestValidator.predicate(
    "administrative notes are present",
    retrievedPayout.notes !== null && retrievedPayout.notes !== undefined,
  );
  typia.assertGuard(retrievedPayout.notes!);
  TestValidator.equals(
    "administrative notes match",
    retrievedPayout.notes,
    adminNotes,
  );
  TestValidator.predicate(
    "notes explain adjustment",
    retrievedPayout.notes.length > 0,
  );
}
