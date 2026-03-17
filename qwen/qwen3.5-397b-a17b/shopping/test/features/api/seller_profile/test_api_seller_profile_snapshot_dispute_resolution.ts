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

export async function test_api_seller_profile_snapshot_dispute_resolution(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);
  const adminLogin = await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(adminLogin);
  // 2. Seller setup - register seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const initialShopName = RandomGenerator.name();
  const initialShopDescription = RandomGenerator.paragraph({ sentences: 3 });
  const initialLogoUrl = typia.random<string & tags.Format<"uri">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
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
  // 3. Admin approves seller registration
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerId,
    });
  typia.assert(approvedSeller);
  TestValidator.equals(
    "approval status",
    approvedSeller.approval_status,
    "APPROVED",
  );
  // 4. First profile update - creates snapshot 1
  const firstUpdateShopName = RandomGenerator.name();
  const firstUpdateDescription = RandomGenerator.paragraph({ sentences: 4 });
  const firstUpdateLogoUrl = typia.random<string & tags.Format<"url">>();
  const firstUpdateResult =
    await api.functional.shoppingMall.admin.sellers.update(adminConnection, {
      sellerId: sellerId,
      body: {
        shop_name: firstUpdateShopName,
        shop_description: firstUpdateDescription,
        logo_image_url: firstUpdateLogoUrl,
      } satisfies IShoppingMallSeller.IUpdate,
    });
  typia.assert(firstUpdateResult);
  TestValidator.equals(
    "first update shop name",
    firstUpdateResult.shop_name,
    firstUpdateShopName,
  );
  // 5. Second profile update - creates snapshot 2
  const secondUpdateShopName = RandomGenerator.name();
  const secondUpdateDescription = RandomGenerator.paragraph({ sentences: 5 });
  const secondUpdateLogoUrl = typia.random<string & tags.Format<"url">>();
  const secondUpdateResult =
    await api.functional.shoppingMall.admin.sellers.update(adminConnection, {
      sellerId: sellerId,
      body: {
        shop_name: secondUpdateShopName,
        shop_description: secondUpdateDescription,
        logo_image_url: secondUpdateLogoUrl,
      } satisfies IShoppingMallSeller.IUpdate,
    });
  typia.assert(secondUpdateResult);
  TestValidator.equals(
    "second update shop name",
    secondUpdateResult.shop_name,
    secondUpdateShopName,
  );
  // 6. Retrieve snapshot list
  const snapshotList =
    await api.functional.shoppingMall.admin.sellers.profile.snapshots.list(
      adminConnection,
      {
        sellerId: sellerId,
      },
    );
  typia.assert(snapshotList);
  TestValidator.predicate("has snapshots", snapshotList.data.length >= 2);
  // 7. Validate snapshots contain correct historical data
  // Snapshots are ordered newest first, so index 0 is second update, index 1 is first update
  const secondSnapshot = snapshotList.data[0];
  const firstSnapshot = snapshotList.data[1];
  typia.assert(secondSnapshot);
  typia.assert(firstSnapshot);
  // Validate second snapshot (most recent) matches second update
  TestValidator.equals(
    "second snapshot shop name",
    secondSnapshot.shopName,
    secondUpdateShopName,
  );
  TestValidator.equals(
    "second snapshot description",
    secondSnapshot.shopDescription,
    secondUpdateDescription,
  );
  TestValidator.equals(
    "second snapshot logo",
    secondSnapshot.logoImageUrl,
    typia.assert<string & tags.Format<"uri">>(secondUpdateLogoUrl),
  );
  // Validate first snapshot matches first update
  TestValidator.equals(
    "first snapshot shop name",
    firstSnapshot.shopName,
    firstUpdateShopName,
  );
  TestValidator.equals(
    "first snapshot description",
    firstSnapshot.shopDescription,
    firstUpdateDescription,
  );
  TestValidator.equals(
    "first snapshot logo",
    firstSnapshot.logoImageUrl,
    typia.assert<string & tags.Format<"uri">>(firstUpdateLogoUrl),
  );
  // 8. Retrieve specific snapshot by ID for dispute resolution
  const retrievedSnapshot =
    await api.functional.shoppingMall.admin.sellers.profile.snapshots.at(
      adminConnection,
      {
        sellerId: sellerId,
        snapshotId: firstSnapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // Validate retrieved snapshot matches the one from list
  TestValidator.equals(
    "retrieved snapshot ID",
    retrievedSnapshot.id,
    firstSnapshot.id,
  );
  TestValidator.equals(
    "retrieved snapshot shop name",
    retrievedSnapshot.shopName,
    firstUpdateShopName,
  );
  TestValidator.equals(
    "retrieved snapshot description",
    retrievedSnapshot.shopDescription,
    firstUpdateDescription,
  );
  TestValidator.equals(
    "retrieved snapshot logo",
    retrievedSnapshot.logoImageUrl,
    typia.assert<string & tags.Format<"uri">>(firstUpdateLogoUrl),
  );
  // 9. Validate snapshot immutability - snapshots preserve historical state
  // Current seller profile should have second update values
  TestValidator.equals(
    "current profile shop name",
    secondUpdateResult.shop_name,
    secondUpdateShopName,
  );
  // But first snapshot should still have first update values (immutable historical record)
  TestValidator.notEquals(
    "snapshot preserves history",
    firstSnapshot.shopName,
    secondUpdateShopName,
  );
  TestValidator.equals(
    "snapshot is immutable record",
    firstSnapshot.shopName,
    firstUpdateShopName,
  );
}