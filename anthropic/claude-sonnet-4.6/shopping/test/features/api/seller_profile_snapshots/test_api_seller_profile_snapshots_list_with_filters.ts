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

export async function test_api_seller_profile_snapshots_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // ── 1. Setup: Register seller ──────────────────────────────────────────────
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      shop_name: "Alpha Shop",
    },
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  // ── 2. Setup: Register admin ───────────────────────────────────────────────
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // ── 3. Admin updates seller shop name → "Alpha Electronics" (snapshot #1) ──
  const update1 = await api.functional.shoppingMall.admin.sellers.update(
    adminConnection,
    {
      sellerId,
      body: {
        shopName: "Alpha Electronics",
        shopDescription: "Electronics store with Alpha brand",
        logoUrl: null,
      } satisfies IShoppingMallSeller.IUpdate,
    },
  );
  typia.assert(update1);
  // Record timestamp AFTER snapshot #1, BEFORE snapshot #2
  const timestampBetween = new Date().toISOString();
  // Small delay to ensure distinct timestamps for snapshot #2
  await new Promise<void>((resolve) => setTimeout(resolve, 100));
  // ── 4. Admin updates seller shop name → "Beta Gadgets" (snapshot #2) ───────
  const update2 = await api.functional.shoppingMall.admin.sellers.update(
    adminConnection,
    {
      sellerId,
      body: {
        shopName: "Beta Gadgets",
        shopDescription: "Gadgets for everyone",
        logoUrl: null,
      } satisfies IShoppingMallSeller.IUpdate,
    },
  );
  typia.assert(update2);
  // Record timestamp AFTER snapshot #2
  const timestampAfter2 = new Date().toISOString();
  // ── 5. Filter by partial shop name "Alpha" ─────────────────────────────────
  const alphaResult =
    await api.functional.shoppingMall.seller.profileSnapshots.index(
      sellerConnection,
      {
        body: {
          shop_name: "Alpha",
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(alphaResult);
  TestValidator.predicate(
    "Alpha filter returns at least one result",
    alphaResult.data.length >= 1,
  );
  TestValidator.predicate(
    "All results contain 'Alpha' (case-insensitive)",
    alphaResult.data.every((s) => s.shop_name.toLowerCase().includes("alpha")),
  );
  TestValidator.predicate(
    "Beta Gadgets snapshot not in Alpha filter results",
    alphaResult.data.every((s) => !s.shop_name.toLowerCase().includes("beta")),
  );
  // ── 6. Case-insensitive filter with "alpha" ────────────────────────────────
  const alphaLowerResult =
    await api.functional.shoppingMall.seller.profileSnapshots.index(
      sellerConnection,
      {
        body: {
          shop_name: "alpha",
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(alphaLowerResult);
  TestValidator.equals(
    "Case-insensitive 'alpha' returns same count as 'Alpha'",
    alphaResult.data.length,
    alphaLowerResult.data.length,
  );
  TestValidator.predicate(
    "Case-insensitive all results contain 'alpha'",
    alphaLowerResult.data.every((s) =>
      s.shop_name.toLowerCase().includes("alpha"),
    ),
  );
  // ── 7. Filter by date range upper bound → only snapshot #1 ─────────────────
  const beforeSnap2Result =
    await api.functional.shoppingMall.seller.profileSnapshots.index(
      sellerConnection,
      {
        body: {
          created_at_to: timestampBetween,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(beforeSnap2Result);
  TestValidator.predicate(
    "Upper bound filter returns at least one snapshot",
    beforeSnap2Result.data.length >= 1,
  );
  TestValidator.predicate(
    "All results from upper bound filter created before or at timestampBetween",
    beforeSnap2Result.data.every(
      (s) => new Date(s.created_at) <= new Date(timestampBetween),
    ),
  );
  TestValidator.predicate(
    "Beta Gadgets not in upper-bound filtered results",
    beforeSnap2Result.data.every((s) => s.shop_name !== "Beta Gadgets"),
  );
  // ── 8. Filter by date range lower bound → only snapshot #2 ─────────────────
  const afterSnap1Result =
    await api.functional.shoppingMall.seller.profileSnapshots.index(
      sellerConnection,
      {
        body: {
          created_at_from: timestampBetween,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(afterSnap1Result);
  TestValidator.predicate(
    "Lower bound filter returns at least one result",
    afterSnap1Result.data.length >= 1,
  );
  TestValidator.predicate(
    "All results from lower bound filter created at or after timestampBetween",
    afterSnap1Result.data.every(
      (s) => new Date(s.created_at) >= new Date(timestampBetween),
    ),
  );
  // ── 9. Narrow date range covering only snapshot #2 ─────────────────────────
  const narrowResult =
    await api.functional.shoppingMall.seller.profileSnapshots.index(
      sellerConnection,
      {
        body: {
          created_at_from: timestampBetween,
          created_at_to: timestampAfter2,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(narrowResult);
  TestValidator.predicate(
    "Narrow range returns at least one result",
    narrowResult.data.length >= 1,
  );
  TestValidator.predicate(
    "All narrow range results are within the specified date range",
    narrowResult.data.every(
      (s) =>
        new Date(s.created_at) >= new Date(timestampBetween) &&
        new Date(s.created_at) <= new Date(timestampAfter2),
    ),
  );
  // ── 10. Pagination: page=1, limit=1 ────────────────────────────────────────
  const page1Result =
    await api.functional.shoppingMall.seller.profileSnapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(page1Result);
  TestValidator.equals(
    "Page 1 returns exactly 1 item",
    page1Result.data.length,
    1,
  );
  TestValidator.equals(
    "Pagination current is 1",
    page1Result.pagination.current,
    1,
  );
  TestValidator.predicate(
    "Pagination records >= 2 (at least 2 snapshots exist)",
    page1Result.pagination.records >= 2,
  );
  TestValidator.predicate(
    "Pagination pages >= 2",
    page1Result.pagination.pages >= 2,
  );
  // ── 11. Pagination: page=2, limit=1 ────────────────────────────────────────
  const page2Result =
    await api.functional.shoppingMall.seller.profileSnapshots.index(
      sellerConnection,
      {
        body: {
          page: 2,
          limit: 1,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "Page 2 returns exactly 1 item",
    page2Result.data.length,
    1,
  );
  TestValidator.equals(
    "Pagination current is 2",
    page2Result.pagination.current,
    2,
  );
  // ── 12. Verify DESC ordering across pages ──────────────────────────────────
  const page1Item = page1Result.data[0]!;
  const page2Item = page2Result.data[0]!;
  TestValidator.predicate(
    "Page 1 item is more recent than page 2 item (DESC order)",
    new Date(page1Item.created_at) >= new Date(page2Item.created_at),
  );
  // Most recent snapshot (Beta Gadgets) appears first (page 1)
  TestValidator.equals(
    "Page 1 most recent snapshot is Beta Gadgets",
    page1Item.shop_name,
    "Beta Gadgets",
  );
  // Older snapshot (Alpha Electronics) appears on page 2
  TestValidator.equals(
    "Page 2 older snapshot is Alpha Electronics",
    page2Item.shop_name,
    "Alpha Electronics",
  );
}
