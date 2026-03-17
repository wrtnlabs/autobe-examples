import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_seller_profiles_snapshots_create } from "../../../generate/generate_random_shopping_mall_administrator_seller_profiles_snapshots_create";
import { prepare_random_shopping_mall_seller_profile_snapshot } from "../../../prepare/prepare_random_shopping_mall_seller_profile_snapshot";

export async function test_api_seller_profile_snapshot_detail_historical_branding_preserved(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerJoin);
  const administratorConnection: api.IConnection = { host: connection.host };
  const administratorJoin = await authorize_administrator_join(
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
  typia.assert(administratorJoin);
  const snapshotInput = {
    shopName: `shop-${RandomGenerator.alphabets(8)}`,
    shopDescription: RandomGenerator.paragraph({ sentences: 3 }),
    logoUri: typia.random<string & tags.Format<"uri">>(),
    changedSummary: RandomGenerator.paragraph({ sentences: 4 }),
    changedAt: new Date().toISOString(),
  } satisfies IShoppingMallSellerProfileSnapshot.ICreate;
  const created =
    await generate_random_shopping_mall_administrator_seller_profiles_snapshots_create(
      administratorConnection,
      {
        params: {
          sellerProfileId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: snapshotInput,
      },
    );
  typia.assert(created);
  const firstRead =
    await api.functional.shoppingMall.administrator.seller_profiles.snapshots.at(
      administratorConnection,
      {
        sellerProfileId: created.sellerProfile.id,
        snapshotId: created.id,
      },
    );
  typia.assert(firstRead);
  const secondRead =
    await api.functional.shoppingMall.administrator.seller_profiles.snapshots.at(
      administratorConnection,
      {
        sellerProfileId: created.sellerProfile.id,
        snapshotId: created.id,
      },
    );
  typia.assert(secondRead);
  TestValidator.equals(
    "snapshot id matches created id",
    firstRead.id,
    created.id,
  );
  TestValidator.equals(
    "seller profile id matches requested parent",
    firstRead.sellerProfile.id,
    created.sellerProfile.id,
  );
  TestValidator.equals(
    "shop name preserved from input",
    firstRead.shopName,
    snapshotInput.shopName,
  );
  TestValidator.equals(
    "shop name preserved from creation",
    firstRead.shopName,
    created.shopName,
  );
  TestValidator.equals(
    "shop description preserved from creation",
    firstRead.shopDescription,
    created.shopDescription,
  );
  TestValidator.equals(
    "logo uri preserved from creation",
    firstRead.logoUri,
    created.logoUri,
  );
  TestValidator.equals(
    "changed summary preserved from input",
    firstRead.changedSummary,
    snapshotInput.changedSummary,
  );
  TestValidator.equals(
    "changedAt preserved from input",
    firstRead.changedAt,
    snapshotInput.changedAt,
  );
  TestValidator.equals(
    "repeated read returns same snapshot payload",
    secondRead,
    firstRead,
  );
}
