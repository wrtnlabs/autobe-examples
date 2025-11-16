import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPayout";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

/**
 * Verify that a platform admin can search seller payouts using sellerId,
 * payoutStatus, and createdAt date-range filters, and that results are
 * correctly paginated and sorted by createdAt in descending order.
 *
 * Business flow:
 *
 * 1. Join as a new platform admin so that platformAdmin-scoped APIs are
 *    authorized.
 * 2. Create a guest cart to represent upstream shopping activity (context only).
 * 3. Create multiple seller payout batches with varying seller_id, payout_status,
 *    and timestamps, including several that share the same seller and status
 *    within a narrow createdAt window and others that should be filtered out.
 * 4. Call PATCH /shoppingMall/platformAdmin/sellerPayouts with an
 *    IShoppingMallSellerPayout.IRequest filter specifying:
 *
 *    - SellerId of the target seller,
 *    - PayoutStatus equal to the chosen status,
 *    - FromCreatedAt/toCreatedAt bounding the created_at timestamps of the in-window
 *         payouts,
 *    - OrderBy="createdAt" and orderDirection="desc",
 *    - Page/limit sized to return all matching payouts.
 * 5. Assert that only payouts for the target seller with the requested status and
 *    created_at within the given window are returned, that pagination metadata
 *    matches the count, and that created_at is sorted descending.
 */
export async function test_api_platform_admin_seller_payout_search_with_filters(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join)
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://landing.example.com",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a guest cart as upstream activity context
  const guestCartBody = {
    guest_token: RandomGenerator.alphaNumeric(16),
    ip: "127.0.0.1",
    user_agent: "jest-e2e-test-agent",
    referrer: "https://shop.example.com",
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartBody,
    });
  typia.assert(guestCart);

  // 3. Create multiple seller payouts for two different sellers.
  const sellerAId = typia.random<string & tags.Format<"uuid">>();
  const sellerBId = typia.random<string & tags.Format<"uuid">>();
  const targetStatus = "payout_pending";
  const otherStatus = "payout_failed";

  // Helper to build a payout create body
  const makePayoutCreate = (args: {
    sellerId: string & tags.Format<"uuid">;
    status: string;
    gross: number;
    fee?: number;
    adjustment?: number;
    scheduledAt: string & tags.Format<"date-time">;
    periodStart?: string & tags.Format<"date-time">;
    periodEnd?: string & tags.Format<"date-time">;
  }): IShoppingMallSellerPayout.ICreate => {
    return {
      seller_id: args.sellerId,
      currency_code: "KRW",
      gross_amount: args.gross,
      fee_amount: args.fee,
      adjustment_amount: args.adjustment,
      net_amount: args.gross - (args.fee ?? 0) + (args.adjustment ?? 0),
      period_start: args.periodStart,
      period_end: args.periodEnd,
      payout_status: args.status,
      scheduled_payout_at: args.scheduledAt,
      memo: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies IShoppingMallSellerPayout.ICreate;
  };

  // Base time for constructing periods and schedule
  const now = new Date();
  const nowIso = now.toISOString();
  const laterIso = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
  const earlierIso = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

  // Payouts that SHOULD match filters: sellerA + targetStatus, created "around now"
  const matchingBodies: IShoppingMallSellerPayout.ICreate[] = [
    makePayoutCreate({
      sellerId: sellerAId,
      status: targetStatus,
      gross: 100_000,
      fee: 10_000,
      adjustment: 0,
      scheduledAt: laterIso,
      periodStart: earlierIso,
      periodEnd: laterIso,
    }),
    makePayoutCreate({
      sellerId: sellerAId,
      status: targetStatus,
      gross: 200_000,
      fee: 20_000,
      adjustment: 5_000,
      scheduledAt: laterIso,
      periodStart: earlierIso,
      periodEnd: laterIso,
    }),
    makePayoutCreate({
      sellerId: sellerAId,
      status: targetStatus,
      gross: 150_000,
      fee: 15_000,
      adjustment: -5_000,
      scheduledAt: laterIso,
      periodStart: earlierIso,
      periodEnd: laterIso,
    }),
  ];

  const matchingPayouts: IShoppingMallSellerPayout[] = [];
  for (const body of matchingBodies) {
    const created: IShoppingMallSellerPayout =
      await api.functional.shoppingMall.platformAdmin.sellerPayouts.create(
        connection,
        { body },
      );
    typia.assert(created);
    matchingPayouts.push(created);
  }

  // Payouts that SHOULD NOT match: different status for same seller
  const nonMatchingSameSellerBodies: IShoppingMallSellerPayout.ICreate[] = [
    makePayoutCreate({
      sellerId: sellerAId,
      status: otherStatus,
      gross: 50_000,
      fee: 5_000,
      adjustment: 0,
      scheduledAt: laterIso,
      periodStart: earlierIso,
      periodEnd: laterIso,
    }),
  ];

  const nonMatchingSameSeller: IShoppingMallSellerPayout[] = [];
  for (const body of nonMatchingSameSellerBodies) {
    const created: IShoppingMallSellerPayout =
      await api.functional.shoppingMall.platformAdmin.sellerPayouts.create(
        connection,
        { body },
      );
    typia.assert(created);
    nonMatchingSameSeller.push(created);
  }

  // Payouts that SHOULD NOT match: same status but different seller
  const nonMatchingOtherSellerBodies: IShoppingMallSellerPayout.ICreate[] = [
    makePayoutCreate({
      sellerId: sellerBId,
      status: targetStatus,
      gross: 80_000,
      fee: 8_000,
      adjustment: 0,
      scheduledAt: laterIso,
      periodStart: earlierIso,
      periodEnd: laterIso,
    }),
  ];

  const nonMatchingOtherSeller: IShoppingMallSellerPayout[] = [];
  for (const body of nonMatchingOtherSellerBodies) {
    const created: IShoppingMallSellerPayout =
      await api.functional.shoppingMall.platformAdmin.sellerPayouts.create(
        connection,
        { body },
      );
    typia.assert(created);
    nonMatchingOtherSeller.push(created);
  }

  // Establish filter window around the createdAt of matching payouts
  const createdTimes = matchingPayouts.map((p) =>
    new Date(p.createdAt).getTime(),
  );
  const minCreated = Math.min(...createdTimes);
  const maxCreated = Math.max(...createdTimes);
  const fromCreatedAt = new Date(minCreated - 1000).toISOString();
  const toCreatedAt = new Date(maxCreated + 1000).toISOString();

  // 4. Call index with sellerId + payoutStatus + createdAt window filters
  const indexBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined,
    sellerId: sellerAId,
    payoutStatus: targetStatus,
    fromCreatedAt,
    toCreatedAt,
    orderBy: "createdAt",
    orderDirection: "desc",
  } satisfies IShoppingMallSellerPayout.IRequest;

  const pageResult: IPageIShoppingMallSellerPayout.ISummary =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.index(
      connection,
      { body: indexBody },
    );
  typia.assert(pageResult);

  const pagination = pageResult.pagination;
  const summaries = pageResult.data;

  // 5. Pagination counts should reflect only matching payouts
  const expectedCount = matchingPayouts.length;

  TestValidator.equals(
    "pagination.records equals number of matching payouts",
    pagination.records,
    expectedCount,
  );

  TestValidator.predicate(
    "pagination.limit is at least number of matching payouts",
    () => pagination.limit >= expectedCount,
  );

  TestValidator.predicate(
    "pagination.current is non-negative",
    () => pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination.pages is at least 1 when there are records",
    () =>
      expectedCount === 0 ? pagination.pages === 0 : pagination.pages >= 1,
  );

  TestValidator.equals(
    "returned data length equals expected count",
    summaries.length,
    expectedCount,
  );

  // 6. Validate that all returned summaries match filters
  for (const summary of summaries) {
    // seller summary must match sellerAId
    TestValidator.equals(
      "summary.seller.id matches filtered sellerId",
      summary.seller.id,
      sellerAId,
    );

    // payout_status must match filter
    TestValidator.equals(
      "summary.payout_status matches filtered payoutStatus",
      summary.payout_status,
      targetStatus,
    );

    // created_at within window
    const createdAtTime = new Date(summary.created_at).getTime();
    const fromTime = new Date(fromCreatedAt).getTime();
    const toTime = new Date(toCreatedAt).getTime();

    TestValidator.predicate(
      "summary.created_at is within [fromCreatedAt, toCreatedAt]",
      () => createdAtTime >= fromTime && createdAtTime <= toTime,
    );
  }

  // 7. Ensure that known non-matching payouts are not present
  const allReturnedIds = summaries.map((s) => s.id);

  for (const p of nonMatchingSameSeller) {
    TestValidator.predicate(
      "payout with same seller but different status is not returned",
      () => allReturnedIds.indexOf(p.id) === -1,
    );
  }

  for (const p of nonMatchingOtherSeller) {
    TestValidator.predicate(
      "payout with different seller but same status is not returned",
      () => allReturnedIds.indexOf(p.id) === -1,
    );
  }

  // 8. Check sorting by created_at desc
  for (let i = 1; i < summaries.length; i++) {
    const prev = new Date(summaries[i - 1].created_at).getTime();
    const curr = new Date(summaries[i].created_at).getTime();

    TestValidator.predicate(
      "created_at is sorted in non-increasing (desc) order",
      () => prev >= curr,
    );
  }
}
