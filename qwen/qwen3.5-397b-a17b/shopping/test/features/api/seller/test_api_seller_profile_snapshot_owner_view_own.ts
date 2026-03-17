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

export async function test_api_seller_profile_snapshot_owner_view_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create and login admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await authorize_admin_login(adminConnection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IShoppingMallAdmin.ILogin,
    });
  typia.assert(adminLogin);
  // 2. Seller setup - create seller account with shop information
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const shopName = RandomGenerator.name();
  const shopDescription = RandomGenerator.paragraph({ sentences: 3 });
  const logoImageUrl = typia.random<string & tags.Format<"uri">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        shop_name: shopName,
        shop_description: shopDescription,
        logo_image_url: logoImageUrl,
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(sellerJoin);
  const sellerId = sellerJoin.id;
  // 3. Login as seller to get authenticated connection
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await authorize_seller_login(sellerLoginConnection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.ILogin,
    });
  typia.assert(sellerLogin);
  // 4. Seller views their own profile snapshots
  const snapshotsResponse: IPageISellerProfileSnapshot =
    await api.functional.shoppingMall.admin.sellers.profile.snapshots.list(
      sellerLoginConnection,
      {
        sellerId: sellerId,
      },
    );
  typia.assert(snapshotsResponse);
  // 5. Validate response structure
  TestValidator.predicate(
    "pagination exists",
    snapshotsResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(snapshotsResponse.data),
  );
  TestValidator.equals("current page", snapshotsResponse.pagination.current, 1);
  TestValidator.predicate(
    "limit is positive",
    snapshotsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    snapshotsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    snapshotsResponse.pagination.pages >= 0,
  );
  // 6. Validate snapshot structure if any exist
  if (snapshotsResponse.data.length > 0) {
    const firstSnapshot = snapshotsResponse.data[0];
    TestValidator.predicate("snapshot has id", firstSnapshot.id !== undefined);
    TestValidator.predicate(
      "snapshot has seller",
      firstSnapshot.seller !== undefined,
    );
    TestValidator.equals(
      "snapshot shop name",
      firstSnapshot.shopName,
      shopName,
    );
    TestValidator.equals(
      "snapshot shop description",
      firstSnapshot.shopDescription ?? null,
      shopDescription ?? null,
    );
    TestValidator.equals(
      "snapshot logo URL",
      firstSnapshot.logoImageUrl ?? null,
      logoImageUrl ?? null,
    );
    TestValidator.predicate(
      "snapshot has createdAt",
      firstSnapshot.createdAt !== undefined,
    );
    // Validate seller info in snapshot
    TestValidator.equals(
      "snapshot seller id",
      firstSnapshot.seller.id,
      sellerId,
    );
    TestValidator.equals(
      "snapshot seller email",
      firstSnapshot.seller.email,
      sellerEmail,
    );
    TestValidator.equals(
      "snapshot seller shop name",
      firstSnapshot.seller.shop_name,
      shopName,
    );
  }
  // 7. Validate chronological order (newest first) if multiple snapshots
  if (snapshotsResponse.data.length > 1) {
    for (let i = 0; i < snapshotsResponse.data.length - 1; i++) {
      const current = snapshotsResponse.data[i];
      const next = snapshotsResponse.data[i + 1];
      TestValidator.predicate(
        "snapshots ordered newest first",
        new Date(current.createdAt).getTime() >=
          new Date(next.createdAt).getTime(),
      );
    }
  }
}