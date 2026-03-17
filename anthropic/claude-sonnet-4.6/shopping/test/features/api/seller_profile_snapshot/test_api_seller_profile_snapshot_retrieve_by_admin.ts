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

export async function test_api_seller_profile_snapshot_retrieve_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register an admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register a seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuthorized);
  const sellerId = sellerAuthorized.id;
  // 3. As admin, update the seller's shop profile to trigger creation of a snapshot
  const shopName = `TestShop_${RandomGenerator.alphaNumeric(8)}`;
  const shopDescription = RandomGenerator.paragraph({ sentences: 3 });
  const logoUrl = typia.random<
    string & tags.Format<"uri"> & tags.MaxLength<80000>
  >();
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
  // 4. As seller, list own profile snapshots to capture the snapshotId
  const snapshotPage =
    await api.functional.shoppingMall.seller.profileSnapshots.index(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  TestValidator.predicate(
    "snapshot list should not be empty",
    snapshotPage.data.length > 0,
  );
  const snapshotId = snapshotPage.data[0]!.id;
  // 5. As admin, retrieve the snapshot — verifying cross-actor access for dispute resolution
  const snapshot = await api.functional.shoppingMall.seller.profileSnapshots.at(
    adminConnection,
    {
      snapshotId,
    },
  );
  typia.assert(snapshot);
  // Validate snapshot fields match what was set in the profile update
  TestValidator.equals("snapshot id matches", snapshot.id, snapshotId);
  TestValidator.equals(
    "snapshot seller id matches",
    snapshot.seller.id,
    sellerId,
  );
  TestValidator.equals(
    "snapshot shopName matches",
    snapshot.shopName,
    shopName,
  );
  TestValidator.equals(
    "snapshot shopDescription matches",
    snapshot.shopDescription,
    shopDescription,
  );
  TestValidator.equals("snapshot logoUrl matches", snapshot.logoUrl, logoUrl);
  // 6. Verify snapshot immutability: do a second profile update
  const shopName2 = `UpdatedShop_${RandomGenerator.alphaNumeric(8)}`;
  const logoUrl2 = typia.random<
    string & tags.Format<"uri"> & tags.MaxLength<80000>
  >();
  const updatedSeller2 = await api.functional.shoppingMall.admin.sellers.update(
    adminConnection,
    {
      sellerId,
      body: {
        shopName: shopName2,
        shopDescription: "Changed description",
        logoUrl: logoUrl2,
      } satisfies IShoppingMallSeller.IUpdate,
    },
  );
  typia.assert(updatedSeller2);
  // Retrieve the original snapshot again and confirm its data is frozen/unchanged
  const snapshotAgain =
    await api.functional.shoppingMall.seller.profileSnapshots.at(
      adminConnection,
      {
        snapshotId,
      },
    );
  typia.assert(snapshotAgain);
  TestValidator.equals(
    "original snapshot id unchanged after second update",
    snapshotAgain.id,
    snapshotId,
  );
  TestValidator.equals(
    "original snapshot shopName is frozen after second update",
    snapshotAgain.shopName,
    shopName,
  );
  TestValidator.equals(
    "original snapshot shopDescription is frozen after second update",
    snapshotAgain.shopDescription,
    shopDescription,
  );
  TestValidator.equals(
    "original snapshot logoUrl is frozen after second update",
    snapshotAgain.logoUrl,
    logoUrl,
  );
}
