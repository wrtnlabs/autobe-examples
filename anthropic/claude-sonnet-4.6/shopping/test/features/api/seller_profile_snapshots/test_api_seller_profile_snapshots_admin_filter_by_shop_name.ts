import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshots_admin_filter_by_shop_name(
  connection: api.IConnection,
): Promise<void> {
  // ----------------------------------------------------------------
  // 1. Setup: Register admin
  // ----------------------------------------------------------------
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // ----------------------------------------------------------------
  // 2. Setup: Register seller
  // ----------------------------------------------------------------
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  const sellerId = sellerAuth.id;
  // Record time before creating snapshots (for date range tests)
  const beforeSnapshots = new Date(Date.now() - 1000).toISOString();
  // ----------------------------------------------------------------
  // 3. Create snapshot 1: "Sunrise Electronics"
  // ----------------------------------------------------------------
  const snapshot1 = await api.functional.shoppingMall.admin.sellers.update(
    adminConnection,
    {
      sellerId,
      body: {
        shopName: "Sunrise Electronics",
        shopDescription: "Electronics store with sunrise deals",
        logoUrl: null,
      } satisfies IShoppingMallSeller.IUpdate,
    },
  );
  typia.assert(snapshot1);
  // ----------------------------------------------------------------
  // 4. Create snapshot 2: "Moonlight Books"
  // ----------------------------------------------------------------
  const snapshot2 = await api.functional.shoppingMall.admin.sellers.update(
    adminConnection,
    {
      sellerId,
      body: {
        shopName: "Moonlight Books",
        shopDescription: "Books store under the moonlight",
        logoUrl: null,
      } satisfies IShoppingMallSeller.IUpdate,
    },
  );
  typia.assert(snapshot2);
  const afterSnapshots = new Date(Date.now() + 1000).toISOString();
  // ----------------------------------------------------------------
  // 5. Primary test: Filter by partial shop_name "Sunrise"
  // ----------------------------------------------------------------
  const sunriseResult =
    await api.functional.shoppingMall.admin.sellers.profileSnapshots.index(
      adminConnection,
      {
        sellerId,
        body: {
          shop_name: "Sunrise",
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(sunriseResult);
  // Verify response structure has both pagination and data
  TestValidator.predicate(
    "response has pagination key",
    sunriseResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data key",
    Array.isArray(sunriseResult.data),
  );
  // All returned snapshots must contain "Sunrise" in shop_name (case-insensitive)
  TestValidator.predicate(
    "all returned snapshots contain Sunrise in shop_name",
    sunriseResult.data.every((s) =>
      s.shop_name.toLowerCase().includes("sunrise"),
    ),
  );
  // Moonlight snapshots must not appear
  TestValidator.predicate(
    "no Moonlight snapshots in Sunrise filter result",
    sunriseResult.data.every(
      (s) => !s.shop_name.toLowerCase().includes("moonlight"),
    ),
  );
  // pagination.records accurately reflects count of matching snapshots
  TestValidator.equals(
    "pagination records matches data count",
    sunriseResult.pagination.records satisfies number as number,
    sunriseResult.data.length,
  );
  // There should be at least 1 Sunrise result
  TestValidator.predicate(
    "at least one Sunrise snapshot returned",
    sunriseResult.data.length >= 1,
  );
  // ----------------------------------------------------------------
  // 6. Date range filter validation (wide window covering all snapshots)
  // ----------------------------------------------------------------
  const dateRangeResult =
    await api.functional.shoppingMall.admin.sellers.profileSnapshots.index(
      adminConnection,
      {
        sellerId,
        body: {
          created_at_from: beforeSnapshots,
          created_at_to: afterSnapshots,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // All returned snapshots should be within the date range
  TestValidator.predicate(
    "all snapshots within date range",
    dateRangeResult.data.every((s) => {
      const createdAt = new Date(s.created_at).getTime();
      return (
        createdAt >= new Date(beforeSnapshots).getTime() &&
        createdAt <= new Date(afterSnapshots).getTime()
      );
    }),
  );
  // Both snapshots (Sunrise + Moonlight) should be returned in this wide window
  TestValidator.predicate(
    "both snapshots returned in wide date range",
    dateRangeResult.data.length >= 2,
  );
  // Verify snapshots outside range are excluded by using a very narrow past range
  const veryOldFrom = "2000-01-01T00:00:00.000Z";
  const veryOldTo = "2000-01-02T00:00:00.000Z";
  const emptyDateRangeResult =
    await api.functional.shoppingMall.admin.sellers.profileSnapshots.index(
      adminConnection,
      {
        sellerId,
        body: {
          created_at_from: veryOldFrom,
          created_at_to: veryOldTo,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(emptyDateRangeResult);
  TestValidator.predicate(
    "no snapshots in ancient date range",
    emptyDateRangeResult.data.length === 0,
  );
  TestValidator.equals(
    "ancient date range records is 0",
    emptyDateRangeResult.pagination.records satisfies number as number,
    0,
  );
  // ----------------------------------------------------------------
  // 7. Combined filter: shop_name + created_at_from + created_at_to
  // ----------------------------------------------------------------
  const combinedResult =
    await api.functional.shoppingMall.admin.sellers.profileSnapshots.index(
      adminConnection,
      {
        sellerId,
        body: {
          shop_name: "Sunrise",
          created_at_from: beforeSnapshots,
          created_at_to: afterSnapshots,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Intersection: only Sunrise snapshots within date range
  TestValidator.predicate(
    "combined filter returns only Sunrise snapshots in range",
    combinedResult.data.every((s) => {
      const createdAt = new Date(s.created_at).getTime();
      return (
        s.shop_name.toLowerCase().includes("sunrise") &&
        createdAt >= new Date(beforeSnapshots).getTime() &&
        createdAt <= new Date(afterSnapshots).getTime()
      );
    }),
  );
  // ----------------------------------------------------------------
  // 8. Empty result case: non-existent shop name
  // ----------------------------------------------------------------
  const emptyResult =
    await api.functional.shoppingMall.admin.sellers.profileSnapshots.index(
      adminConnection,
      {
        sellerId,
        body: {
          shop_name: "ZZZNonExistentShopName",
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(emptyResult);
  // Response structure includes both pagination and data even when empty
  TestValidator.predicate(
    "empty result has pagination key",
    emptyResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "empty result has data key",
    Array.isArray(emptyResult.data),
  );
  // Empty data array
  TestValidator.equals(
    "empty data array length is 0",
    emptyResult.data.length,
    0,
  );
  // records = 0
  TestValidator.equals(
    "empty result pagination records is 0",
    emptyResult.pagination.records satisfies number as number,
    0,
  );
}
