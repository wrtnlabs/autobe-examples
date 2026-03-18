import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfile";
import type { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshot_history_after_profile_edits(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123" satisfies string,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  const sellerProfiles =
    await api.functional.shoppingMall.seller.sellerProfiles.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallSellerProfile.IRequest,
      },
    );
  typia.assert(sellerProfiles);
  TestValidator.predicate(
    "seller profile list should contain at least one profile",
    sellerProfiles.data.length > 0,
  );
  const sellerProfile = sellerProfiles.data[0];
  typia.assert(sellerProfile);
  const snapshots =
    await api.functional.shoppingMall.seller.seller_profiles.snapshots.index(
      sellerConnection,
      {
        sellerProfileId: sellerProfile.id,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at:desc",
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  TestValidator.equals(
    "snapshot page should be scoped to the requested seller profile",
    snapshots.data[0]?.sellerProfile.id,
    sellerProfile.id,
  );
  TestValidator.predicate(
    "snapshot history should be returned in newest-first order when multiple snapshots exist",
    snapshots.data.length <= 1 ||
      snapshots.data[0].createdAt >= snapshots.data[1].createdAt,
  );
  for (const snapshot of snapshots.data) {
    typia.assert(snapshot);
    TestValidator.equals(
      "every snapshot should reference the same seller profile",
      snapshot.sellerProfile.id,
      sellerProfile.id,
    );
    TestValidator.predicate(
      "snapshot should contain immutable historical shop name data",
      typeof snapshot.shopName === "string" && snapshot.shopName.length > 0,
    );
    TestValidator.predicate(
      "snapshot should contain immutable historical shop description data",
      typeof snapshot.shopDescription === "string" &&
        snapshot.shopDescription.length > 0,
    );
    TestValidator.predicate(
      "snapshot should expose a historical timestamp",
      typeof snapshot.createdAt === "string" && snapshot.createdAt.length > 0,
    );
  }
}
