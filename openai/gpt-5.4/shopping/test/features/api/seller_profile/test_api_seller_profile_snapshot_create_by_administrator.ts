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
import { generate_random_shopping_mall_administrator_seller_profiles_snapshots_create } from "../../../generate/generate_random_shopping_mall_administrator_seller_profiles_snapshots_create";
import { prepare_random_shopping_mall_seller_profile_snapshot } from "../../../prepare/prepare_random_shopping_mall_seller_profile_snapshot";

export async function test_api_seller_profile_snapshot_create_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = {
    host: connection.host,
  };
  const administrator = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(administrator);
  const sellerProfileId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    shopName: RandomGenerator.name(),
    shopDescription: RandomGenerator.paragraph({ sentences: 3 }),
    logoUri: typia.random<string & tags.Format<"uri">>(),
    changedSummary: RandomGenerator.paragraph({ sentences: 4 }),
    changedAt: new Date().toISOString(),
  } satisfies IShoppingMallSellerProfileSnapshot.ICreate;
  const snapshot =
    await generate_random_shopping_mall_administrator_seller_profiles_snapshots_create(
      administratorConnection,
      {
        params: {
          sellerProfileId,
        },
        body,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot belongs to requested seller profile",
    snapshot.sellerProfile.id,
    sellerProfileId,
  );
  TestValidator.equals(
    "shop name is preserved",
    snapshot.shopName,
    body.shopName,
  );
  TestValidator.equals(
    "shop description is preserved",
    snapshot.shopDescription,
    body.shopDescription ?? null,
  );
  TestValidator.equals(
    "logo uri is preserved",
    snapshot.logoUri,
    body.logoUri ?? null,
  );
  TestValidator.equals(
    "changed summary is preserved",
    snapshot.changedSummary,
    body.changedSummary,
  );
  TestValidator.equals(
    "changed at is preserved",
    snapshot.changedAt,
    body.changedAt,
  );
  TestValidator.equals(
    "immutable snapshot timestamps match on insertion",
    snapshot.createdAt,
    snapshot.updatedAt,
  );
  TestValidator.notEquals(
    "snapshot id differs from parent seller profile id",
    snapshot.id,
    sellerProfileId,
  );
}
