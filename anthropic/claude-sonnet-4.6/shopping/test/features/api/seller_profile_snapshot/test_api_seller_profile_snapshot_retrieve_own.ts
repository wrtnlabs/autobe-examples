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

export async function test_api_seller_profile_snapshot_retrieve_own(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuthorized);
  // Step 2: Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuthorized);
  const sellerId = sellerAuthorized.id;
  // Step 3: As admin, update seller's shop profile (creates a profile snapshot)
  const shopName = RandomGenerator.name();
  const shopDescription = RandomGenerator.paragraph({ sentences: 3 });
  const logoUrl = typia.random<string & tags.Format<"uri">>() satisfies string as string & tags.MaxLength<80000> & tags.Format<"uri">;
  const updatedSeller = await api.functional.shoppingMall.admin.sellers.update(
    adminConnection,
    {
      sellerId,
      body: {
        shopName,
        shopDescription,
        logoUrl,
      } satisfies IShoppingMallSeller.IUpdate,
    },
  );
  typia.assert(updatedSeller);
  // Step 4: As seller, list profile snapshots to get the snapshotId
  const snapshotPage =
    await api.functional.shoppingMall.seller.profileSnapshots.index(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  TestValidator.predicate(
    "at least one snapshot exists",
    snapshotPage.data.length > 0,
  );
  const latestSnapshot = snapshotPage.data[0]!;
  const snapshotId = latestSnapshot.id;
  // Main test: retrieve the specific snapshot by ID
  const snapshot = await api.functional.shoppingMall.seller.profileSnapshots.at(
    sellerConnection,
    {
      snapshotId,
    },
  );
  typia.assert(snapshot);
  // Validate snapshot content matches what was set during the profile update
  TestValidator.equals("snapshot id matches", snapshot.id, snapshotId);
  TestValidator.equals("seller id matches", snapshot.seller.id, sellerId);
  TestValidator.equals("shopName matches", snapshot.shopName, shopName);
  TestValidator.equals(
    "shopDescription matches",
    snapshot.shopDescription,
    shopDescription,
  );
  TestValidator.equals("logoUrl matches", snapshot.logoUrl, logoUrl);
  // Verify immutability: re-fetch the snapshot and confirm identical data
  const snapshot2 =
    await api.functional.shoppingMall.seller.profileSnapshots.at(
      sellerConnection,
      {
        snapshotId,
      },
    );
  typia.assert(snapshot2);
  TestValidator.equals("immutability: id", snapshot2.id, snapshot.id);
  TestValidator.equals(
    "immutability: shopName",
    snapshot2.shopName,
    snapshot.shopName,
  );
  TestValidator.equals(
    "immutability: shopDescription",
    snapshot2.shopDescription,
    snapshot.shopDescription,
  );
  TestValidator.equals(
    "immutability: logoUrl",
    snapshot2.logoUrl,
    snapshot.logoUrl,
  );
  TestValidator.equals(
    "immutability: createdAt",
    snapshot2.createdAt,
    snapshot.createdAt,
  );
}