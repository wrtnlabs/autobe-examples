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
 * Test that administrators can filter payouts by seller_id to retrieve only
 * payouts belonging to a specific seller account.
 *
 * This test validates the seller-specific filtering functionality of the payout
 * search API. It creates multiple seller accounts with their respective payouts
 * and verifies that the seller_id filter correctly restricts results to payouts
 * for the specified seller only, ensuring proper data isolation and
 * seller-specific financial tracking.
 *
 * Workflow:
 *
 * 1. Authenticate as admin
 * 2. Create first seller account
 * 3. Create multiple payout records for first seller
 * 4. Create second seller account
 * 5. Create payout records for second seller
 * 6. Search payouts filtering by first seller's ID
 * 7. Validate results contain only first seller's payouts
 * 8. Verify second seller's payouts are excluded
 */
export async function test_api_seller_payout_search_by_seller_id(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const admin: IShoppingMallAdmin.IAuthorized =
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
  typia.assert(admin);

  // Step 2: Create first seller account
  const seller1: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
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
  typia.assert(seller1);

  // Step 3: Create multiple payout records for first seller
  const seller1PayoutCount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<5>
  >();
  const seller1Payouts: IShoppingMallSellerPayout[] =
    await ArrayUtil.asyncRepeat(seller1PayoutCount, async () => {
      const grossAmount = typia.random<
        number & tags.Minimum<1000> & tags.Maximum<10000>
      >();
      const commissionAmount = typia.random<
        number & tags.Minimum<100> & tags.Maximum<1000>
      >();
      const refundAmount = typia.random<
        number & tags.Minimum<0> & tags.Maximum<500>
      >();
      const adjustmentAmount = typia.random<
        number & tags.Minimum<-100> & tags.Maximum<100>
      >();
      const netPayoutAmount =
        grossAmount - commissionAmount - refundAmount + adjustmentAmount;

      const payout: IShoppingMallSellerPayout =
        await api.functional.shoppingMall.admin.sellerPayouts.create(
          connection,
          {
            body: {
              shopping_mall_seller_id: seller1.id,
              payout_period_start: new Date(
                Date.now() - 30 * 24 * 60 * 60 * 1000,
              ).toISOString(),
              payout_period_end: new Date().toISOString(),
              gross_amount: grossAmount,
              commission_amount: commissionAmount,
              refund_amount: refundAmount,
              adjustment_amount: adjustmentAmount,
              net_payout_amount: netPayoutAmount,
              currency: "USD",
              status: "completed",
            } satisfies IShoppingMallSellerPayout.ICreate,
          },
        );
      typia.assert(payout);
      return payout;
    });

  // Step 4: Create second seller account
  const seller2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
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
  typia.assert(seller2);

  // Step 5: Create payout records for second seller
  const seller2PayoutCount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<4>
  >();
  await ArrayUtil.asyncRepeat(seller2PayoutCount, async () => {
    const grossAmount = typia.random<
      number & tags.Minimum<1000> & tags.Maximum<10000>
    >();
    const commissionAmount = typia.random<
      number & tags.Minimum<100> & tags.Maximum<1000>
    >();
    const refundAmount = typia.random<
      number & tags.Minimum<0> & tags.Maximum<500>
    >();
    const adjustmentAmount = typia.random<
      number & tags.Minimum<-100> & tags.Maximum<100>
    >();
    const netPayoutAmount =
      grossAmount - commissionAmount - refundAmount + adjustmentAmount;

    const payout: IShoppingMallSellerPayout =
      await api.functional.shoppingMall.admin.sellerPayouts.create(connection, {
        body: {
          shopping_mall_seller_id: seller2.id,
          payout_period_start: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          payout_period_end: new Date().toISOString(),
          gross_amount: grossAmount,
          commission_amount: commissionAmount,
          refund_amount: refundAmount,
          adjustment_amount: adjustmentAmount,
          net_payout_amount: netPayoutAmount,
          currency: "USD",
          status: "pending",
        } satisfies IShoppingMallSellerPayout.ICreate,
      });
    typia.assert(payout);
  });

  // Step 6: Search payouts filtering by first seller's ID
  const filteredPayouts: IPageIShoppingMallSellerPayout.ISummary =
    await api.functional.shoppingMall.admin.sellerPayouts.index(connection, {
      body: {
        seller_id: seller1.id,
        page: 1,
        limit: 50,
      } satisfies IShoppingMallSellerPayout.IRequest,
    });
  typia.assert(filteredPayouts);

  // Step 7: Validate results contain only first seller's payouts
  TestValidator.equals(
    "filtered payout count matches first seller's payout count",
    filteredPayouts.data.length,
    seller1PayoutCount,
  );

  TestValidator.equals(
    "pagination total records matches first seller's payout count",
    filteredPayouts.pagination.records,
    seller1PayoutCount,
  );

  // Step 8: Verify all returned payouts belong to first seller
  for (const payout of filteredPayouts.data) {
    TestValidator.equals(
      "payout belongs to first seller",
      payout.shopping_mall_seller_id,
      seller1.id,
    );
  }

  // Step 9: Verify second seller's payouts are excluded
  const hasSecondSellerPayout = filteredPayouts.data.some(
    (p) => p.shopping_mall_seller_id === seller2.id,
  );
  TestValidator.predicate(
    "no payouts from second seller in filtered results",
    hasSecondSellerPayout === false,
  );
}
