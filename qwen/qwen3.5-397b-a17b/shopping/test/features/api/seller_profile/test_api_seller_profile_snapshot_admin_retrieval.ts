import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageISellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageISellerProfileSnapshot";
import type { ISellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ISellerProfileSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function test_api_seller_profile_snapshot_admin_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration - store credentials for login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Admin login with stored credentials
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 3. Seller registration
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const initialShopName = RandomGenerator.name();
  const initialShopDescription = RandomGenerator.paragraph({ sentences: 3 });
  const initialLogoUrl = typia.random<string & tags.Format<"uri">>();
  const sellerJoin = await authorize_seller_join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: initialShopName,
      shop_description: initialShopDescription,
      logo_image_url: initialLogoUrl,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const sellerId = sellerJoin.id;
  // 4. Admin approves seller registration
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerId,
    });
  typia.assert(approvedSeller);
  TestValidator.equals(
    "seller approval status",
    approvedSeller.approval_status,
    "APPROVED",
  );
  // 5. Admin updates seller profile (creates snapshot of state BEFORE update)
  const updateBody = {
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_image_url: typia.random<string & tags.Format<"url">>(),
  } satisfies IShoppingMallSeller.IUpdate;
  const updatedSeller = await api.functional.shoppingMall.admin.sellers.update(
    adminConnection,
    {
      sellerId: sellerId,
      body: updateBody,
    },
  );
  typia.assert(updatedSeller);
  TestValidator.equals(
    "shop name updated",
    updatedSeller.shop_name,
    updateBody.shop_name,
  );
  // 6. Admin lists seller profile snapshots
  const snapshotsList =
    await api.functional.shoppingMall.admin.sellers.profile.snapshots.list(
      adminConnection,
      {
        sellerId: sellerId,
      },
    );
  typia.assert(snapshotsList);
  TestValidator.predicate(
    "has at least one snapshot",
    snapshotsList.data.length >= 1,
  );
  // 7. Get the first snapshot ID
  const snapshotId = snapshotsList.data[0].id;
  // 8. Admin retrieves specific snapshot by ID
  const snapshot =
    await api.functional.shoppingMall.admin.sellers.profile.snapshots.at(
      adminConnection,
      {
        sellerId: sellerId,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // Validate snapshot structure
  TestValidator.equals("snapshot ID matches", snapshot.id, snapshotId);
  TestValidator.equals("seller ID matches", snapshot.seller.id, sellerId);
  TestValidator.equals(
    "seller email matches",
    snapshot.seller.email,
    sellerEmail,
  );
  TestValidator.predicate("shop name exists", snapshot.shopName.length > 0);
  TestValidator.predicate(
    "created at is valid date",
    new Date(snapshot.createdAt).getTime() > 0,
  );
  // Validate snapshot captures state before update (snapshot is created BEFORE changes applied)
  TestValidator.equals(
    "snapshot shop name",
    snapshot.shopName,
    initialShopName,
  );
  TestValidator.equals(
    "snapshot shop description",
    snapshot.shopDescription,
    initialShopDescription,
  );
  TestValidator.equals(
    "snapshot logo URL",
    snapshot.logoImageUrl,
    initialLogoUrl,
  );
  // Validate seller summary in snapshot
  TestValidator.equals(
    "snapshot seller shop name",
    snapshot.seller.shop_name,
    updateBody.shop_name,
  );
  TestValidator.equals(
    "snapshot seller approval status",
    snapshot.seller.approval_status,
    "APPROVED",
  );
  TestValidator.predicate(
    "snapshot seller has approvedByAdmin",
    snapshot.seller.approvedByAdmin !== null,
  );
}
