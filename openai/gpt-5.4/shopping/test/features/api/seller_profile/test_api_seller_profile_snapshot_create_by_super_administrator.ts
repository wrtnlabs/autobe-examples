import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_shopping_mall_super_administrator_seller_profiles_snapshots_create } from "../../../generate/generate_random_shopping_mall_super_administrator_seller_profiles_snapshots_create";
import { prepare_random_shopping_mall_seller_profile_snapshot } from "../../../prepare/prepare_random_shopping_mall_seller_profile_snapshot";

export async function test_api_seller_profile_snapshot_create_by_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  const superAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  const authorized = await authorize_super_administrator_join(
    superAdministratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(authorized);
  const sellerProfileId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    shopName: `shop-${RandomGenerator.alphabets(8)}`,
    shopDescription: RandomGenerator.paragraph({ sentences: 3 }),
    logoUri: typia.random<string & tags.Format<"uri">>(),
    changedSummary: RandomGenerator.paragraph({ sentences: 4 }),
    changedAt: new Date().toISOString(),
  } satisfies IShoppingMallSellerProfileSnapshot.ICreate;
  const snapshot: IShoppingMallSellerProfileSnapshot =
    await generate_random_shopping_mall_super_administrator_seller_profiles_snapshots_create(
      superAdministratorConnection,
      {
        params: {
          sellerProfileId,
        },
        body,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot shopName preserved",
    snapshot.shopName,
    body.shopName,
  );
  TestValidator.equals(
    "snapshot shopDescription preserved",
    snapshot.shopDescription,
    body.shopDescription ?? null,
  );
  TestValidator.equals(
    "snapshot logoUri preserved",
    snapshot.logoUri,
    body.logoUri ?? null,
  );
  TestValidator.equals(
    "snapshot changedSummary preserved",
    snapshot.changedSummary,
    body.changedSummary,
  );
  TestValidator.equals(
    "snapshot changedAt preserved",
    snapshot.changedAt,
    body.changedAt,
  );
  TestValidator.notEquals(
    "snapshot has independent identity",
    snapshot.id,
    sellerProfileId,
  );
  TestValidator.equals(
    "snapshot belongs to requested seller profile",
    snapshot.sellerProfile.id,
    sellerProfileId,
  );
  TestValidator.equals(
    "immutable snapshot updatedAt equals createdAt",
    snapshot.updatedAt,
    snapshot.createdAt,
  );
}
