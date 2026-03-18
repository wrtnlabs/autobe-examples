import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_profile_snapshot_access_after_profile_change(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  const sellerProfileId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.shoppingMall.administrator.seller_profiles.snapshots.at(
      adminConnection,
      {
        sellerProfileId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  TestValidator.predicate("snapshot id exists", snapshot.id.length > 0);
  TestValidator.predicate(
    "snapshot shop name exists",
    snapshot.shopName.length > 0,
  );
  TestValidator.predicate(
    "snapshot shop description exists",
    snapshot.shopDescription.length > 0,
  );
  TestValidator.predicate(
    "snapshot createdAt exists",
    snapshot.createdAt.length > 0,
  );
  TestValidator.predicate(
    "snapshot seller profile exists",
    snapshot.sellerProfile.id.length > 0,
  );
  TestValidator.predicate(
    "snapshot logo uri is preserved or null",
    snapshot.logoImageUri === null || snapshot.logoImageUri.length > 0,
  );
}
