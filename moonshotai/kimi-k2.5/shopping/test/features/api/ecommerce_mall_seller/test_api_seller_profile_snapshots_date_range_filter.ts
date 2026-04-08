import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that an authenticated seller can filter profile snapshots by date range.
 * Validates that createdAfter and createdBefore parameters correctly filter
 * snapshots and pagination metadata reflects filtered counts.
 */
export async function test_api_seller_profile_snapshots_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: typia.random<IEcommerceMallSeller.IJoin>(),
  });
  // 2. Get all snapshots first to understand baseline
  const allSnapshots =
    await api.functional.ecommerceMall.seller.profile_snapshots.index(
      sellerConnection,
      {
        body: {
          createdAfter: null,
          createdBefore: null,
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // 3. Test createdAfter filter (yesterday)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayISOString = yesterday.toISOString();
  const recentSnapshots =
    await api.functional.ecommerceMall.seller.profile_snapshots.index(
      sellerConnection,
      {
        body: {
          createdAfter: yesterdayISOString,
          createdBefore: null,
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(recentSnapshots);
  // Verify all returned snapshots are within date range
  for (const snapshot of recentSnapshots.data) {
    const createdAt = new Date(snapshot.createdAt);
    const afterDate = new Date(yesterdayISOString);
    TestValidator.predicate(
      "snapshot createdAt should be on or after createdAfter",
      createdAt.getTime() >= afterDate.getTime(),
    );
  }
  // Verify pagination reflects filtered count constraint
  TestValidator.predicate(
    "recent snapshots count should not exceed total",
    recentSnapshots.data.length <= allSnapshots.data.length,
  );
  // 4. Test createdBefore filter (last month)
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const lastMonthISOString = lastMonth.toISOString();
  const olderSnapshots =
    await api.functional.ecommerceMall.seller.profile_snapshots.index(
      sellerConnection,
      {
        body: {
          createdAfter: null,
          createdBefore: lastMonthISOString,
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(olderSnapshots);
  // Verify all returned snapshots are within date range
  for (const snapshot of olderSnapshots.data) {
    const createdAt = new Date(snapshot.createdAt);
    const beforeDate = new Date(lastMonthISOString);
    TestValidator.predicate(
      "snapshot createdAt should be on or before createdBefore",
      createdAt.getTime() <= beforeDate.getTime(),
    );
  }
  // 5. Test both createdAfter and createdBefore (specific window)
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - 30);
  const windowEnd = new Date();
  windowEnd.setDate(windowEnd.getDate() - 1);
  const windowSnapshots =
    await api.functional.ecommerceMall.seller.profile_snapshots.index(
      sellerConnection,
      {
        body: {
          createdAfter: windowStart.toISOString(),
          createdBefore: windowEnd.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(windowSnapshots);
  // Verify all returned snapshots are within date window
  for (const snapshot of windowSnapshots.data) {
    const createdAt = new Date(snapshot.createdAt);
    const startDate = new Date(windowStart);
    const endDate = new Date(windowEnd);
    TestValidator.predicate(
      "snapshot createdAt should be within date window",
      createdAt.getTime() >= startDate.getTime() &&
        createdAt.getTime() <= endDate.getTime(),
    );
  }
  // 6. Test pagination metadata reflects filtered count
  TestValidator.predicate(
    "filtered count should not exceed total count",
    windowSnapshots.pagination.records <= allSnapshots.pagination.records,
  );
}
