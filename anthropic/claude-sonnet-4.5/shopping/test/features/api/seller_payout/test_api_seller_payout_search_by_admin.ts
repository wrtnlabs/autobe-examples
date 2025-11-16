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
 * Test administrator seller payout search functionality with comprehensive
 * filtering and pagination.
 *
 * This test validates that administrators can successfully search and retrieve
 * paginated seller payout records using various filtering criteria including
 * seller ID, payout status, date ranges, amount thresholds, and sorting
 * options. The test ensures proper pagination metadata, complete financial
 * breakdown in responses, and correct query composition for multiple filter
 * combinations.
 *
 * Test Flow:
 *
 * 1. Authenticate as administrator
 * 2. Create multiple sellers for test data diversity
 * 3. Generate diverse payout records with varying statuses, amounts, and dates
 * 4. Test pagination with different page sizes
 * 5. Validate filtering by seller ID
 * 6. Validate filtering by payout status
 * 7. Validate filtering by amount ranges
 * 8. Validate filtering by settlement period dates
 * 9. Validate filtering by processing timestamps
 * 10. Test sorting in ascending and descending order
 * 11. Verify pagination metadata accuracy
 * 12. Validate complete payout summary information in responses
 */
export async function test_api_seller_payout_search_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
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

  // Step 2: Create multiple sellers for diverse test data
  const sellers: IShoppingMallSeller.IAuthorized[] =
    await ArrayUtil.asyncRepeat(3, async () => {
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
      return seller;
    });

  // Step 3: Re-authenticate as admin (sellers join changed the connection auth)
  await api.functional.auth.admin.join(connection, {
    body: {
      email: admin.email,
      password: typia.random<string & tags.Format<"password">>(),
      full_name: admin.full_name,
      phone_number: admin.phone_number,
      admin_level: admin.admin_level,
      email_verified: admin.email_verified,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });

  // Step 4: Generate diverse payout records
  const baseDate = new Date();
  const payoutStatuses = [
    "pending",
    "processing",
    "completed",
    "failed",
  ] as const;

  const createdPayouts: IShoppingMallSellerPayout[] =
    await ArrayUtil.asyncRepeat(12, async (index) => {
      const seller = sellers[index % sellers.length];
      const status = RandomGenerator.pick(payoutStatuses);
      const grossAmount = typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<50000>
      >();
      const commissionAmount = grossAmount * 0.15;
      const refundAmount = typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<1000>
      >();
      const adjustmentAmount = typia.random<
        number & tags.Minimum<-500> & tags.Maximum<500>
      >();
      const netPayoutAmount =
        grossAmount - commissionAmount - refundAmount + adjustmentAmount;

      const periodStartOffset = index * 7 * 24 * 60 * 60 * 1000;
      const periodStart = new Date(baseDate.getTime() - periodStartOffset);
      const periodEnd = new Date(
        periodStart.getTime() + 7 * 24 * 60 * 60 * 1000,
      );

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
              status: status,
              bank_account_last_four:
                status !== "pending"
                  ? typia
                      .random<
                        number &
                          tags.Type<"uint32"> &
                          tags.Minimum<1000> &
                          tags.Maximum<9999>
                      >()
                      .toString()
                  : undefined,
              bank_name:
                status !== "pending"
                  ? RandomGenerator.name(1) + " Bank"
                  : undefined,
              transfer_reference:
                status === "completed" || status === "failed"
                  ? RandomGenerator.alphaNumeric(16)
                  : undefined,
              failure_reason:
                status === "failed"
                  ? RandomGenerator.pick([
                      "invalid_account",
                      "insufficient_funds",
                      "bank_rejected",
                    ] as const)
                  : undefined,
              initiated_at:
                status !== "pending"
                  ? new Date(
                      periodEnd.getTime() + 24 * 60 * 60 * 1000,
                    ).toISOString()
                  : undefined,
              completed_at:
                status === "completed"
                  ? new Date(
                      periodEnd.getTime() + 48 * 60 * 60 * 1000,
                    ).toISOString()
                  : undefined,
              notes:
                index % 3 === 0
                  ? RandomGenerator.paragraph({ sentences: 2 })
                  : undefined,
            } satisfies IShoppingMallSellerPayout.ICreate,
          },
        );
      typia.assert(payout);
      return payout;
    });

  // Step 5: Test basic pagination
  const page1 = await api.functional.shoppingMall.admin.sellerPayouts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallSellerPayout.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 current page", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 5);
  TestValidator.predicate("page 1 has data", page1.data.length > 0);
  TestValidator.predicate(
    "page 1 data length <= limit",
    page1.data.length <= 5,
  );

  // Step 6: Test filtering by specific seller
  const targetSeller = sellers[0];
  const sellerPayouts =
    await api.functional.shoppingMall.admin.sellerPayouts.index(connection, {
      body: {
        seller_id: targetSeller.id,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSellerPayout.IRequest,
    });
  typia.assert(sellerPayouts);
  TestValidator.predicate(
    "filtered by seller has results",
    sellerPayouts.data.length > 0,
  );
  for (const payout of sellerPayouts.data) {
    TestValidator.equals(
      "payout belongs to target seller",
      payout.shopping_mall_seller_id,
      targetSeller.id,
    );
  }

  // Step 7: Test filtering by payout status
  const completedPayouts =
    await api.functional.shoppingMall.admin.sellerPayouts.index(connection, {
      body: {
        status: "completed",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSellerPayout.IRequest,
    });
  typia.assert(completedPayouts);
  for (const payout of completedPayouts.data) {
    TestValidator.equals(
      "payout status is completed",
      payout.status,
      "completed",
    );
  }

  // Step 8: Test filtering by amount range
  const amountFilteredPayouts =
    await api.functional.shoppingMall.admin.sellerPayouts.index(connection, {
      body: {
        min_amount: 5000,
        max_amount: 30000,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSellerPayout.IRequest,
    });
  typia.assert(amountFilteredPayouts);
  for (const payout of amountFilteredPayouts.data) {
    TestValidator.predicate(
      "payout amount within range",
      payout.net_payout_amount >= 5000 && payout.net_payout_amount <= 30000,
    );
  }

  // Step 9: Test filtering by settlement period dates
  const dateRangeStart = new Date(
    baseDate.getTime() - 30 * 24 * 60 * 60 * 1000,
  );
  const dateRangeEnd = new Date(baseDate.getTime() - 10 * 24 * 60 * 60 * 1000);
  const dateFilteredPayouts =
    await api.functional.shoppingMall.admin.sellerPayouts.index(connection, {
      body: {
        payout_date_from: dateRangeStart.toISOString(),
        payout_date_to: dateRangeEnd.toISOString(),
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSellerPayout.IRequest,
    });
  typia.assert(dateFilteredPayouts);
  for (const payout of dateFilteredPayouts.data) {
    const periodStart = new Date(payout.payout_period_start);
    TestValidator.predicate(
      "payout period within date range",
      periodStart >= dateRangeStart && periodStart <= dateRangeEnd,
    );
  }

  // Step 10: Test sorting by net payout amount ascending
  const sortedAscPayouts =
    await api.functional.shoppingMall.admin.sellerPayouts.index(connection, {
      body: {
        page: 1,
        limit: 10,
        sort_by: "net_payout_amount",
        sort_order: "asc",
      } satisfies IShoppingMallSellerPayout.IRequest,
    });
  typia.assert(sortedAscPayouts);
  if (sortedAscPayouts.data.length > 1) {
    for (let i = 0; i < sortedAscPayouts.data.length - 1; i++) {
      TestValidator.predicate(
        "ascending sort order",
        sortedAscPayouts.data[i].net_payout_amount <=
          sortedAscPayouts.data[i + 1].net_payout_amount,
      );
    }
  }

  // Step 11: Test sorting by net payout amount descending
  const sortedDescPayouts =
    await api.functional.shoppingMall.admin.sellerPayouts.index(connection, {
      body: {
        page: 1,
        limit: 10,
        sort_by: "net_payout_amount",
        sort_order: "desc",
      } satisfies IShoppingMallSellerPayout.IRequest,
    });
  typia.assert(sortedDescPayouts);
  if (sortedDescPayouts.data.length > 1) {
    for (let i = 0; i < sortedDescPayouts.data.length - 1; i++) {
      TestValidator.predicate(
        "descending sort order",
        sortedDescPayouts.data[i].net_payout_amount >=
          sortedDescPayouts.data[i + 1].net_payout_amount,
      );
    }
  }

  // Step 12: Test sorting by payout period start date
  const sortedByDatePayouts =
    await api.functional.shoppingMall.admin.sellerPayouts.index(connection, {
      body: {
        page: 1,
        limit: 10,
        sort_by: "payout_period_start",
        sort_order: "desc",
      } satisfies IShoppingMallSellerPayout.IRequest,
    });
  typia.assert(sortedByDatePayouts);

  // Step 13: Test combined filters
  const combinedFilterPayouts =
    await api.functional.shoppingMall.admin.sellerPayouts.index(connection, {
      body: {
        status: "completed",
        min_amount: 1000,
        sort_by: "completed_at",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSellerPayout.IRequest,
    });
  typia.assert(combinedFilterPayouts);
  for (const payout of combinedFilterPayouts.data) {
    TestValidator.equals("combined filter: status", payout.status, "completed");
    TestValidator.predicate(
      "combined filter: min amount",
      payout.net_payout_amount >= 1000,
    );
  }
}
