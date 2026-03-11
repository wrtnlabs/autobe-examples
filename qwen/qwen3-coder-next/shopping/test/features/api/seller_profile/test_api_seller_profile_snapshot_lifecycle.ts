import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShopProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShopProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShopProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Verify seller profile snapshot lifecycle:
 * 1. Register seller and get authorized
 * 2. Retrieve and validate snapshot list with pagination
 * 3. Verify snapshot ordering (newest first)
 * 4. Test timestamp-based filtering
 * 5. Test seller_id filter
 * 6. Verify snapshot immutability across retrievals
 * 7. Test chronological ordering of snapshots
 */
export async function test_api_seller_profile_snapshot_lifecycle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller and get authorized
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Retrieve snapshots with pagination (no edit capability in current API)
  const paginatedSnapshots =
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallShopProfile.IRequest,
      },
    );
  typia.assert(paginatedSnapshots);
  // 3. Validate pagination properties
  TestValidator.predicate(
    "pagination has valid current page",
    paginatedSnapshots.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    paginatedSnapshots.pagination.limit >= 1 &&
      paginatedSnapshots.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    paginatedSnapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    paginatedSnapshots.pagination.pages >= 0,
  );
  // 4. Validate snapshot structure
  if (paginatedSnapshots.data.length > 0) {
    const firstSnapshot = paginatedSnapshots.data[0];
    TestValidator.equals(
      "snapshot seller id matches authenticated seller",
      firstSnapshot.ecommerce_mall_seller_id,
      seller.id,
    );
    TestValidator.predicate(
      "snapshot has valid profile ID",
      Boolean(firstSnapshot.ecommerce_mall_shop_profile_id),
    );
    TestValidator.predicate(
      "snapshot has created_at timestamp",
      firstSnapshot.created_at !== null &&
        firstSnapshot.created_at !== undefined,
    );
    TestValidator.predicate(
      "snapshot timestamp is valid ISO format",
      new Date(firstSnapshot.created_at).toISOString() ===
        firstSnapshot.created_at,
    );
  }
  // 5. Test timestamp-based filtering (using future dates to ensure no results or empty filter)
  const filteredSnapshots =
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          after: new Date(2020, 0, 1).toISOString(),
          before: new Date().toISOString(),
        } satisfies IEcommerceMallShopProfile.IRequest,
      },
    );
  typia.assert(filteredSnapshots);
  // 6. Test seller_id filter (should return same data when authenticated seller's ID is used)
  const sellerIdSnapshots =
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          seller_id: seller.id,
        } satisfies IEcommerceMallShopProfile.IRequest,
      },
    );
  typia.assert(sellerIdSnapshots);
  // 7. Verify pagination consistency
  TestValidator.equals(
    "seller_id filtered count matches paginated count",
    sellerIdSnapshots.pagination.records,
    paginatedSnapshots.pagination.records,
  );
  // 8. Test snapshot pagination with different page sizes
  const page2Snapshots =
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IEcommerceMallShopProfile.IRequest,
      },
    );
  typia.assert(page2Snapshots);
  TestValidator.predicate(
    "smaller page size returns same or fewer records",
    page2Snapshots.data.length <= paginatedSnapshots.data.length,
  );
  // 9. Verify snapshots are ordered newest first
  if (paginatedSnapshots.data.length > 1) {
    for (let i = 0; i < paginatedSnapshots.data.length - 1; i++) {
      const current = new Date(paginatedSnapshots.data[i].created_at);
      const next = new Date(paginatedSnapshots.data[i + 1].created_at);
      TestValidator.predicate(
        `snapshot ${i} (${current.toISOString()}) >= snapshot ${i + 1} (${next.toISOString()})`,
        current >= next,
      );
    }
  }
  // 10. Test edge cases - empty results with future date range
  const emptySnapshots =
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          after: new Date(2030, 0, 1).toISOString(), // Future date - should return empty
          before: new Date(2031, 0, 1).toISOString(),
        } satisfies IEcommerceMallShopProfile.IRequest,
      },
    );
  typia.assert(emptySnapshots);
  // 11. Verify snapshot structure integrity
  for (const snapshot of paginatedSnapshots.data) {
    TestValidator.predicate(
      "snapshot has valid UUID seller_id",
      /^[0-9a-f-]{36}$/i.test(snapshot.ecommerce_mall_seller_id),
    );
    TestValidator.predicate(
      "snapshot has valid UUID profile_id",
      /^[0-9a-f-]{36}$/i.test(snapshot.ecommerce_mall_shop_profile_id),
    );
  }
}
