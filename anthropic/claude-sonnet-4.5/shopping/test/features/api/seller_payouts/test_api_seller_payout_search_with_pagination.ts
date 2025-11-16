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
 * Test that seller payout search results are correctly paginated with
 * configurable page sizes and proper navigation metadata.
 *
 * This test validates the pagination functionality of the seller payout search
 * API by creating a large dataset of payout records and verifying that
 * pagination works correctly with different page numbers and limit values.
 *
 * Steps:
 *
 * 1. Authenticate as admin for payout management permissions
 * 2. Create a seller account to own the payout records
 * 3. Generate 30 payout records to enable multi-page testing
 * 4. Test page 1 with limit 10 and validate metadata
 * 5. Test page 2 with limit 10 and verify non-overlapping results
 * 6. Test page 3 with limit 10 and verify continuation
 * 7. Test different page size (limit 15) and validate recalculated pagination
 * 8. Verify that all records are accessible through pagination
 */
export async function test_api_seller_payout_search_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: RandomGenerator.pick([
        "super_admin",
        "moderator",
        "support",
      ] as const),
      email_verified: true,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a seller account
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: RandomGenerator.name(2),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 3: Create 30 payout records for pagination testing
  const payoutCount = 30;
  const createdPayouts = await ArrayUtil.asyncRepeat(
    payoutCount,
    async (index) => {
      const periodStart = new Date(
        Date.now() - (payoutCount - index) * 7 * 24 * 60 * 60 * 1000,
      );
      const periodEnd = new Date(
        periodStart.getTime() + 7 * 24 * 60 * 60 * 1000,
      );

      const grossAmount = typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<50000>
      >();
      const commissionAmount = grossAmount * 0.15;
      const refundAmount = typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
      >();
      const adjustmentAmount = typia.random<
        number & tags.Type<"int32"> & tags.Minimum<-500> & tags.Maximum<500>
      >();
      const netPayoutAmount =
        grossAmount - commissionAmount - refundAmount + adjustmentAmount;

      const payout =
        await api.functional.shoppingMall.admin.sellerPayouts.create(
          connection,
          {
            body: {
              shopping_mall_seller_id: seller.id,
              payout_period_start: periodStart.toISOString(),
              payout_period_end: periodEnd.toISOString(),
              gross_amount: grossAmount,
              commission_amount: commissionAmount,
              refund_amount: refundAmount,
              adjustment_amount: adjustmentAmount,
              net_payout_amount: netPayoutAmount,
              currency: "USD",
              status: RandomGenerator.pick([
                "pending",
                "processing",
                "completed",
                "failed",
              ] as const),
              bank_account_last_four: typia
                .random<
                  number &
                    tags.Type<"int32"> &
                    tags.Minimum<1000> &
                    tags.Maximum<9999>
                >()
                .toString(),
              bank_name: RandomGenerator.name(2),
              transfer_reference: typia.random<string & tags.Format<"uuid">>(),
            } satisfies IShoppingMallSellerPayout.ICreate,
          },
        );
      typia.assert(payout);
      return payout;
    },
  );

  // Step 4: Test pagination with page 1, limit 10
  const page1 = await api.functional.shoppingMall.admin.sellerPayouts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        seller_id: seller.id,
      } satisfies IShoppingMallSellerPayout.IRequest,
    },
  );
  typia.assert(page1);

  // Validate page 1 metadata
  TestValidator.equals(
    "page 1 current page number",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1.pagination.limit, 10);
  TestValidator.equals(
    "page 1 total records",
    page1.pagination.records,
    payoutCount,
  );
  TestValidator.equals("page 1 total pages", page1.pagination.pages, 3);
  TestValidator.equals("page 1 data length", page1.data.length, 10);

  // Step 5: Test pagination with page 2, limit 10
  const page2 = await api.functional.shoppingMall.admin.sellerPayouts.index(
    connection,
    {
      body: {
        page: 2,
        limit: 10,
        seller_id: seller.id,
      } satisfies IShoppingMallSellerPayout.IRequest,
    },
  );
  typia.assert(page2);

  // Validate page 2 metadata
  TestValidator.equals(
    "page 2 current page number",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2.pagination.limit, 10);
  TestValidator.equals(
    "page 2 total records",
    page2.pagination.records,
    payoutCount,
  );
  TestValidator.equals("page 2 total pages", page2.pagination.pages, 3);
  TestValidator.equals("page 2 data length", page2.data.length, 10);

  // Verify non-overlapping results between page 1 and page 2
  const page1Ids = page1.data.map((p) => p.id);
  const page2Ids = page2.data.map((p) => p.id);
  const hasOverlap = page1Ids.some((id) => page2Ids.includes(id));
  TestValidator.predicate(
    "page 1 and page 2 have no overlapping records",
    hasOverlap === false,
  );

  // Step 6: Test pagination with page 3, limit 10
  const page3 = await api.functional.shoppingMall.admin.sellerPayouts.index(
    connection,
    {
      body: {
        page: 3,
        limit: 10,
        seller_id: seller.id,
      } satisfies IShoppingMallSellerPayout.IRequest,
    },
  );
  typia.assert(page3);

  // Validate page 3 metadata
  TestValidator.equals(
    "page 3 current page number",
    page3.pagination.current,
    3,
  );
  TestValidator.equals("page 3 limit", page3.pagination.limit, 10);
  TestValidator.equals(
    "page 3 total records",
    page3.pagination.records,
    payoutCount,
  );
  TestValidator.equals("page 3 total pages", page3.pagination.pages, 3);
  TestValidator.equals("page 3 data length", page3.data.length, 10);

  // Verify page 3 doesn't overlap with page 1 or page 2
  const page3Ids = page3.data.map((p) => p.id);
  const hasOverlapWithPage1 = page3Ids.some((id) => page1Ids.includes(id));
  const hasOverlapWithPage2 = page3Ids.some((id) => page2Ids.includes(id));
  TestValidator.predicate(
    "page 3 has no overlap with page 1",
    hasOverlapWithPage1 === false,
  );
  TestValidator.predicate(
    "page 3 has no overlap with page 2",
    hasOverlapWithPage2 === false,
  );

  // Step 7: Test with different page size (limit 15)
  const page1Limit15 =
    await api.functional.shoppingMall.admin.sellerPayouts.index(connection, {
      body: {
        page: 1,
        limit: 15,
        seller_id: seller.id,
      } satisfies IShoppingMallSellerPayout.IRequest,
    });
  typia.assert(page1Limit15);

  // Validate recalculated pagination with limit 15
  TestValidator.equals(
    "limit 15 current page",
    page1Limit15.pagination.current,
    1,
  );
  TestValidator.equals("limit 15 limit", page1Limit15.pagination.limit, 15);
  TestValidator.equals(
    "limit 15 total records",
    page1Limit15.pagination.records,
    payoutCount,
  );
  TestValidator.equals(
    "limit 15 total pages",
    page1Limit15.pagination.pages,
    2,
  );
  TestValidator.equals("limit 15 data length", page1Limit15.data.length, 15);

  // Step 8: Verify all records are accessible through pagination
  const allPayoutIds = new Set<string>();

  // Collect IDs from all pages with limit 10
  allPayoutIds.clear();
  for (const payout of page1.data) {
    allPayoutIds.add(payout.id);
  }
  for (const payout of page2.data) {
    allPayoutIds.add(payout.id);
  }
  for (const payout of page3.data) {
    allPayoutIds.add(payout.id);
  }

  TestValidator.equals(
    "all 30 records accessible through pagination",
    allPayoutIds.size,
    payoutCount,
  );
}
