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

export async function test_api_seller_profile_snapshots_list_own_scope(
  connection: api.IConnection,
): Promise<void> {
  // ─── Step 1: Register Seller 1 ───────────────────────────────────────────
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1Password = RandomGenerator.alphaNumeric(16);
  const seller1ShopName = RandomGenerator.name();
  const sellerConnection1: api.IConnection = { host: connection.host };
  const seller1Authorized = await authorize_seller_join(sellerConnection1, {
    body: {
      email: seller1Email,
      password: seller1Password,
      shop_name: seller1ShopName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller1Authorized);
  const seller1Id = seller1Authorized.id;
  // ─── Step 2: Register Admin ───────────────────────────────────────────────
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuthorized);
  // ─── Step 3: Admin updates Seller 1's profile (creates snapshot) ─────────
  const updatedShopName1 = RandomGenerator.name();
  const updatedShopDescription1 = RandomGenerator.paragraph({ sentences: 2 });
  const updatedSeller1 = await api.functional.shoppingMall.admin.sellers.update(
    adminConnection,
    {
      sellerId: seller1Id,
      body: {
        shopName: updatedShopName1,
        shopDescription: updatedShopDescription1,
        logoUrl: null,
      } satisfies IShoppingMallSeller.IUpdate,
    },
  );
  typia.assert(updatedSeller1);
  // ─── Step 4: As Seller 1, list own snapshots with empty/default request ───
  const page1Result =
    await api.functional.shoppingMall.seller.profileSnapshots.index(
      sellerConnection1,
      {
        body: {} satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(page1Result);
  // ─── Step 5: Validate pagination defaults ─────────────────────────────────
  TestValidator.equals(
    "pagination.current should be 1",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit should be 20 (default)",
    page1Result.pagination.limit,
    20,
  );
  // ─── Step 6: Validate all snapshots belong to Seller 1 ───────────────────
  TestValidator.predicate(
    "at least one snapshot should exist for seller 1",
    page1Result.data.length > 0,
  );
  for (const snapshot of page1Result.data) {
    TestValidator.equals(
      "snapshot seller.id matches seller 1",
      snapshot.seller.id,
      seller1Id,
    );
    TestValidator.equals(
      "snapshot seller.email matches seller 1",
      snapshot.seller.email,
      seller1Email,
    );
  }
  // ─── Step 7: Validate descending order by created_at ─────────────────────
  for (let i = 0; i < page1Result.data.length - 1; i++) {
    const current = page1Result.data[i]!;
    const next = page1Result.data[i + 1]!;
    TestValidator.predicate(
      "snapshots sorted by created_at descending",
      current.created_at >= next.created_at,
    );
  }
  // ─── Step 8: Register Seller 2 and create a snapshot for them ────────────
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2Password = RandomGenerator.alphaNumeric(16);
  const seller2ShopName = RandomGenerator.name();
  const sellerConnection2: api.IConnection = { host: connection.host };
  const seller2Authorized = await authorize_seller_join(sellerConnection2, {
    body: {
      email: seller2Email,
      password: seller2Password,
      shop_name: seller2ShopName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller2Authorized);
  const seller2Id = seller2Authorized.id;
  // Admin updates Seller 2's profile to create a snapshot for Seller 2
  const updatedSeller2 = await api.functional.shoppingMall.admin.sellers.update(
    adminConnection,
    {
      sellerId: seller2Id,
      body: {
        shopName: RandomGenerator.name(),
        shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
        logoUrl: null,
      } satisfies IShoppingMallSeller.IUpdate,
    },
  );
  typia.assert(updatedSeller2);
  // ─── Step 9: As Seller 1, list own snapshots again → data isolation check ─
  const page2Result =
    await api.functional.shoppingMall.seller.profileSnapshots.index(
      sellerConnection1,
      {
        body: {} satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(page2Result);
  // All snapshots should still belong to Seller 1 (no Seller 2 contamination)
  for (const snapshot of page2Result.data) {
    TestValidator.equals(
      "data isolation: all snapshots belong to seller 1 only",
      snapshot.seller.id,
      seller1Id,
    );
  }
  // Count should remain the same (Seller 2's snapshot should not appear)
  TestValidator.equals(
    "snapshot count unchanged after seller 2 creation",
    page2Result.pagination.records,
    page1Result.pagination.records,
  );
}
