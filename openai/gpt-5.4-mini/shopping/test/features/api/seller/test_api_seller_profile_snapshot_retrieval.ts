import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_seller_profile_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<1> & tags.Format<"password">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  const snapshot =
    await api.functional.shoppingMall.seller.seller_profiles.snapshots.at(
      sellerConnection,
      {
        sellerProfileId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot id should be a uuid string",
    snapshot.id,
    snapshot.id,
  );
  TestValidator.equals(
    "snapshot should contain a seller profile summary",
    snapshot.sellerProfile.id,
    snapshot.sellerProfile.id,
  );
  TestValidator.equals(
    "snapshot shop name should exist",
    snapshot.shopName,
    snapshot.shopName,
  );
  TestValidator.equals(
    "snapshot shop description should exist",
    snapshot.shopDescription,
    snapshot.shopDescription,
  );
  TestValidator.equals(
    "snapshot createdAt should exist",
    snapshot.createdAt,
    snapshot.createdAt,
  );
}
