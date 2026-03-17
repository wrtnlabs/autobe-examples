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

export async function test_api_seller_profile_snapshot_created_on_admin_profile_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  // 3. First profile update by admin
  const firstShopName = "Original Shop Name";
  const firstUpdate = await api.functional.shoppingMall.admin.sellers.update(
    adminConnection,
    {
      sellerId,
      body: {
        shopName: firstShopName,
        shopDescription: "Original description",
        logoUrl: "https://example.com/original-logo.png",
      } satisfies IShoppingMallSeller.IUpdate,
    },
  );
  typia.assert(firstUpdate);
  TestValidator.equals(
    "first update shop name",
    firstUpdate.shopName,
    firstShopName,
  );
  // 5. Retrieve snapshot history after first update
  const snapshotsAfterFirst =
    await api.functional.shoppingMall.admin.sellers.profileSnapshots.index(
      adminConnection,
      {
        sellerId,
        body: {} satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsAfterFirst);
  // 6. Verify at least one snapshot exists with the first shopName
  TestValidator.predicate(
    "at least one snapshot after first update",
    snapshotsAfterFirst.data.length >= 1,
  );
  TestValidator.predicate(
    "first snapshot contains original shop name",
    snapshotsAfterFirst.data.some((s) => s.shop_name === firstShopName),
  );
  // 7. Second profile update by admin
  const secondShopName = "Updated Shop Name V2";
  const secondUpdate = await api.functional.shoppingMall.admin.sellers.update(
    adminConnection,
    {
      sellerId,
      body: {
        shopName: secondShopName,
        shopDescription: "New description",
        logoUrl: "https://example.com/new-logo.png",
      } satisfies IShoppingMallSeller.IUpdate,
    },
  );
  typia.assert(secondUpdate);
  TestValidator.equals(
    "second update shop name",
    secondUpdate.shopName,
    secondShopName,
  );
  // 9. Retrieve snapshot history after second update
  const snapshotsAfterSecond =
    await api.functional.shoppingMall.admin.sellers.profileSnapshots.index(
      adminConnection,
      {
        sellerId,
        body: {} satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsAfterSecond);
  // 10. Verify at least two snapshots now exist
  TestValidator.predicate(
    "at least two snapshots after second update",
    snapshotsAfterSecond.data.length >= 2,
  );
  // 11. Verify immutability: original snapshot with first shopName still exists
  TestValidator.predicate(
    "original snapshot with first shop name still exists (immutability)",
    snapshotsAfterSecond.data.some((s) => s.shop_name === firstShopName),
  );
  // Verify second snapshot with new shopName also exists
  TestValidator.predicate(
    "second snapshot with updated shop name exists",
    snapshotsAfterSecond.data.some((s) => s.shop_name === secondShopName),
  );
}
