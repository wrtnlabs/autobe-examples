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

export async function test_api_platform_admin_seller_payout_search_combined_date_filters(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin and obtain authorized session
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: RandomGenerator.mobile(),
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a background guest cart to satisfy upstream dependency
  const guestCartBody = {
    guest_token: RandomGenerator.alphaNumeric(24),
    ip: "127.0.0.1",
    user_agent: "E2E-Test-Agent/1.0",
    referrer: "https://shoppingmall.test/home",
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartBody,
    });
  typia.assert(guestCart);

  // 3. Prepare temporal windows for createdAt and executedAt (logical) filters
  const now = new Date();
  const baseCreatedFrom = new Date(now.getTime() - 1000 * 60 * 60 * 24); // 24h ago
  const baseCreatedTo = new Date(now.getTime() + 1000 * 60 * 60 * 24); // 24h ahead

  // Scheduled payout instants used as proxies for executedAt semantics in filters
  const scheduledEarly = new Date(now.getTime() - 1000 * 60 * 60 * 2); // 2h ago
  const scheduledMid = new Date(now.getTime() - 1000 * 60 * 30); // 30m ago
  const scheduledLate = new Date(now.getTime() + 1000 * 60 * 60 * 1); // 1h ahead

  // executedAt filter window configured to include only the "mid" payout logically
  const fromExecutedAt = new Date(scheduledEarly.getTime() + 1000 * 60 * 15); // after early
  const toExecutedAt = new Date(scheduledLate.getTime() - 1000 * 60 * 15); // before late

  // 4. Create multiple seller payouts with different scheduled_payout_at values
  const payoutBodies = [
    {
      seller_id: typia.random<string & tags.Format<"uuid">>(),
      currency_code: "KRW",
      gross_amount: 100000,
      fee_amount: 1000,
      adjustment_amount: 0,
      net_amount: 99000,
      period_start: new Date(
        now.getTime() - 1000 * 60 * 60 * 24 * 7,
      ).toISOString(),
      period_end: now.toISOString(),
      payout_status: "payout_pending",
      scheduled_payout_at: scheduledEarly.toISOString(),
      memo: "early outside executed window",
    },
    {
      seller_id: typia.random<string & tags.Format<"uuid">>(),
      currency_code: "KRW",
      gross_amount: 200000,
      fee_amount: 2000,
      adjustment_amount: 0,
      net_amount: 198000,
      period_start: new Date(
        now.getTime() - 1000 * 60 * 60 * 24 * 7,
      ).toISOString(),
      period_end: now.toISOString(),
      payout_status: "payout_pending",
      scheduled_payout_at: scheduledMid.toISOString(),
      memo: "mid inside executed window",
    },
    {
      seller_id: typia.random<string & tags.Format<"uuid">>(),
      currency_code: "KRW",
      gross_amount: 300000,
      fee_amount: 3000,
      adjustment_amount: 0,
      net_amount: 297000,
      period_start: new Date(
        now.getTime() - 1000 * 60 * 60 * 24 * 7,
      ).toISOString(),
      period_end: now.toISOString(),
      payout_status: "payout_pending",
      scheduled_payout_at: scheduledLate.toISOString(),
      memo: "late outside executed window",
    },
  ] satisfies IShoppingMallSellerPayout.ICreate[];

  const createdPayouts: IShoppingMallSellerPayout[] = [];
  for (const body of payoutBodies) {
    const payout: IShoppingMallSellerPayout =
      await api.functional.shoppingMall.platformAdmin.sellerPayouts.create(
        connection,
        { body },
      );
    typia.assert(payout);
    createdPayouts.push(payout);
  }

  // 5. Call search with combined createdAt and executedAt filters
  const searchBody = {
    page: 1,
    limit: 50,
    fromCreatedAt: baseCreatedFrom.toISOString(),
    toCreatedAt: baseCreatedTo.toISOString(),
    fromExecutedAt: fromExecutedAt.toISOString(),
    toExecutedAt: toExecutedAt.toISOString(),
    orderBy: "createdAt",
    orderDirection: "desc",
  } satisfies IShoppingMallSellerPayout.IRequest;

  const pageResult: IPageIShoppingMallSellerPayout.ISummary =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.index(
      connection,
      { body: searchBody },
    );
  typia.assert(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert(pagination);

  // 6. Determine expected matches logically: only the middle payout should fall in executedAt window
  const expectedMatches: IShoppingMallSellerPayout[] = [createdPayouts[1]];

  // 7. Validate pagination metadata against expected matches
  TestValidator.equals(
    "pagination.records equals expected match count",
    pagination.records,
    expectedMatches.length,
  );

  TestValidator.predicate(
    "pagination.pages is 0 when no records or at least 1 when there are records",
    pagination.records === 0 ? pagination.pages === 0 : pagination.pages >= 1,
  );

  TestValidator.predicate(
    "pagination.current is within valid page range",
    pagination.pages === 0
      ? pagination.current === 0
      : pagination.current >= 0 && pagination.current < pagination.pages,
  );

  // 8. Validate returned data matches expected payouts and createdAt filter
  const resultSummaries = pageResult.data;

  for (const summary of resultSummaries) {
    const summaryCreated = summary.created_at;
    TestValidator.predicate(
      "summary.created_at within createdAt window",
      summaryCreated >= searchBody.fromCreatedAt! &&
        summaryCreated <= searchBody.toCreatedAt!,
    );
  }

  // Confirm ids of returned summaries match expected matches set (ignoring ordering)
  const returnedIds = resultSummaries.map((s) => s.id).sort();
  const expectedIds = expectedMatches.map((p) => p.id).sort();

  TestValidator.equals(
    "set of returned payout ids equals expected match ids (ignoring order)",
    returnedIds,
    expectedIds,
  );

  // 9. Validate sort order by created_at desc
  const createdAtValues = resultSummaries.map((s) => s.created_at);
  const sortedDesc = [...createdAtValues].sort().reverse();
  TestValidator.equals(
    "payout summaries are sorted by created_at in descending order",
    createdAtValues,
    sortedDesc,
  );
}
