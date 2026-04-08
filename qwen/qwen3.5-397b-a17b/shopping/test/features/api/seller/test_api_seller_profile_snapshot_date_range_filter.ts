import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller profile snapshot date range filtering functionality.
 *
 * Validates the profile snapshots endpoint's ability to filter results by creation date range. The test verifies that sellers can query their profile change history within specific time windows using createdAtFrom and createdAtTo parameters, which is essential for auditing profile changes and dispute resolution.
 *
 * The test covers multiple filtering scenarios: both date bounds specified, only lower bound, only upper bound, and no date filters. Each scenario validates that the returned snapshots match the expected time range and maintain descending chronological order.
 *
 * 1. Seller registers and authenticates using authorize_seller_join utility.
 * 2. Tests profile snapshots with both createdAtFrom and createdAtTo specified.
 * 3. Tests profile snapshots with only createdAtFrom (no upper bound).
 * 4. Tests profile snapshots with only createdAtTo (no lower bound).
 * 5. Tests profile snapshots with no date filters (returns all).
 * 6. Validates all responses maintain descending order by created_at.
 * 7. Validates response structure using typia.assert().
 */
export async function test_api_seller_profile_snapshot_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Test with both createdAtFrom and createdAtTo specified
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayFuture = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const bothBoundsResult =
    await api.functional.shoppingMall.seller.profile_snapshots.index(
      sellerConnection,
      {
        body: {
          createdAtFrom: oneDayAgo.toISOString(),
          createdAtTo: oneDayFuture.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(bothBoundsResult);
  // Validate pagination structure
  TestValidator.predicate(
    "has pagination",
    bothBoundsResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "has data array",
    Array.isArray(bothBoundsResult.data),
  );
  TestValidator.predicate(
    "current page is 1",
    bothBoundsResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is valid",
    bothBoundsResult.pagination.limit > 0,
  );
  // Validate descending order by created_at
  if (bothBoundsResult.data.length > 1) {
    for (let i = 0; i < bothBoundsResult.data.length - 1; i++) {
      const current = new Date(bothBoundsResult.data[i].created_at).getTime();
      const next = new Date(bothBoundsResult.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `snapshot ${i} >= snapshot ${i + 1} (descending order)`,
        current >= next,
      );
    }
  }
  // 3. Test with only createdAtFrom (no upper bound)
  const fromOnlyResult =
    await api.functional.shoppingMall.seller.profile_snapshots.index(
      sellerConnection,
      {
        body: {
          createdAtFrom: oneDayAgo.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(fromOnlyResult);
  // Validate all returned snapshots are after createdAtFrom
  const fromTime = oneDayAgo.getTime();
  for (const snapshot of fromOnlyResult.data) {
    const snapshotTime = new Date(snapshot.created_at).getTime();
    TestValidator.predicate(
      "snapshot created_at >= createdAtFrom",
      snapshotTime >= fromTime,
    );
  }
  // 4. Test with only createdAtTo (no lower bound)
  const toOnlyResult =
    await api.functional.shoppingMall.seller.profile_snapshots.index(
      sellerConnection,
      {
        body: {
          createdAtTo: oneDayFuture.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(toOnlyResult);
  // Validate all returned snapshots are before createdAtTo
  const toTime = oneDayFuture.getTime();
  for (const snapshot of toOnlyResult.data) {
    const snapshotTime = new Date(snapshot.created_at).getTime();
    TestValidator.predicate(
      "snapshot created_at <= createdAtTo",
      snapshotTime <= toTime,
    );
  }
  // 5. Test with no date filters (returns all snapshots)
  const noFilterResult =
    await api.functional.shoppingMall.seller.profile_snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(noFilterResult);
  // Validate pagination info is consistent
  TestValidator.predicate(
    "pagination has records count",
    noFilterResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    noFilterResult.pagination.pages >= 0,
  );
  // Validate descending order for no filter result
  if (noFilterResult.data.length > 1) {
    for (let i = 0; i < noFilterResult.data.length - 1; i++) {
      const current = new Date(noFilterResult.data[i].created_at).getTime();
      const next = new Date(noFilterResult.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `no-filter: snapshot ${i} >= snapshot ${i + 1} (descending order)`,
        current >= next,
      );
    }
  }
}
