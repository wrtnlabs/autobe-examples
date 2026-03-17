import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_shopping_mall_super_administrator_seller_profiles_snapshots_create } from "../../../generate/generate_random_shopping_mall_super_administrator_seller_profiles_snapshots_create";
import { prepare_random_shopping_mall_seller_profile_snapshot } from "../../../prepare/prepare_random_shopping_mall_seller_profile_snapshot";

export async function test_api_seller_profile_snapshot_deleted_profile_history_access(
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
  const sellerProfileUpdate =
    await api.functional.shoppingMall.seller.profile.update(sellerConnection, {
      body: {
        displayName: RandomGenerator.name(),
        phoneNumber: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomerProfile.IUpdate,
    });
  typia.assert(sellerProfileUpdate);
  const superAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  const superAdministratorJoin = await authorize_super_administrator_join(
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
  typia.assert(superAdministratorJoin);
  const sellerProfileId = typia.random<string & tags.Format<"uuid">>();
  const snapshotInput = {
    shopName: `${RandomGenerator.name()} ${RandomGenerator.alphabets(3)}`,
    shopDescription: RandomGenerator.paragraph({ sentences: 4 }),
    logoUri: typia.random<string & tags.Format<"uri">>(),
    changedSummary: RandomGenerator.paragraph({ sentences: 3 }),
    changedAt: new Date().toISOString(),
  } satisfies IShoppingMallSellerProfileSnapshot.ICreate;
  const createdSnapshot =
    await generate_random_shopping_mall_super_administrator_seller_profiles_snapshots_create(
      superAdministratorConnection,
      {
        params: {
          sellerProfileId,
        },
        body: snapshotInput,
      },
    );
  typia.assert(createdSnapshot);
  const retrievedSnapshot =
    await api.functional.shoppingMall.superAdministrator.seller_profiles.snapshots.at(
      superAdministratorConnection,
      {
        sellerProfileId,
        snapshotId: createdSnapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  TestValidator.equals(
    "snapshot id matches",
    retrievedSnapshot.id,
    createdSnapshot.id,
  );
  TestValidator.equals(
    "seller profile id matches request",
    retrievedSnapshot.sellerProfile.id,
    sellerProfileId,
  );
  TestValidator.equals(
    "seller profile relation preserved",
    retrievedSnapshot.sellerProfile.id,
    createdSnapshot.sellerProfile.id,
  );
  TestValidator.equals(
    "shop name preserved",
    retrievedSnapshot.shopName,
    createdSnapshot.shopName,
  );
  TestValidator.equals(
    "shop description preserved",
    retrievedSnapshot.shopDescription,
    createdSnapshot.shopDescription,
  );
  TestValidator.equals(
    "logo uri preserved",
    retrievedSnapshot.logoUri,
    createdSnapshot.logoUri,
  );
  TestValidator.equals(
    "changed summary preserved",
    retrievedSnapshot.changedSummary,
    createdSnapshot.changedSummary,
  );
  TestValidator.equals(
    "changed at preserved",
    retrievedSnapshot.changedAt,
    createdSnapshot.changedAt,
  );
  TestValidator.equals(
    "createdAt unchanged on retrieval",
    retrievedSnapshot.createdAt,
    createdSnapshot.createdAt,
  );
  TestValidator.equals(
    "updatedAt unchanged on retrieval",
    retrievedSnapshot.updatedAt,
    createdSnapshot.updatedAt,
  );
}
