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

export async function test_api_seller_profile_snapshot_governance_history_view(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerJoin);
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
  const preservedShopName = `${RandomGenerator.name()} ${RandomGenerator.alphabets(4)}`;
  const preservedShopDescription = RandomGenerator.content({ paragraphs: 2 });
  const preservedLogoUri = typia.random<string & tags.Format<"uri">>();
  const changedSummary = RandomGenerator.paragraph({ sentences: 4 });
  const changedAt = new Date().toISOString() as string &
    tags.Format<"date-time">;
  const createdSnapshot =
    await generate_random_shopping_mall_super_administrator_seller_profiles_snapshots_create(
      superAdministratorConnection,
      {
        params: {
          sellerProfileId,
        },
        body: {
          shopName: preservedShopName,
          shopDescription: preservedShopDescription,
          logoUri: preservedLogoUri,
          changedSummary,
          changedAt,
        },
      },
    );
  typia.assert(createdSnapshot);
  const snapshot =
    await api.functional.shoppingMall.superAdministrator.seller_profiles.snapshots.at(
      superAdministratorConnection,
      {
        sellerProfileId,
        snapshotId: createdSnapshot.id,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot id matches created snapshot",
    snapshot.id,
    createdSnapshot.id,
  );
  TestValidator.equals(
    "snapshot parent seller profile id matches request",
    snapshot.sellerProfile.id,
    sellerProfileId,
  );
  TestValidator.equals(
    "snapshot parent seller profile id matches created snapshot",
    snapshot.sellerProfile.id,
    createdSnapshot.sellerProfile.id,
  );
  TestValidator.equals(
    "shop name is preserved",
    snapshot.shopName,
    preservedShopName,
  );
  TestValidator.equals(
    "shop description is preserved",
    snapshot.shopDescription,
    preservedShopDescription,
  );
  TestValidator.equals(
    "logo uri is preserved",
    snapshot.logoUri,
    preservedLogoUri,
  );
  TestValidator.equals(
    "changed summary is preserved",
    snapshot.changedSummary,
    changedSummary,
  );
  TestValidator.equals(
    "changed timestamp is preserved",
    snapshot.changedAt,
    changedAt,
  );
  TestValidator.equals(
    "created snapshot and retrieved snapshot are identical",
    snapshot,
    createdSnapshot,
  );
  TestValidator.equals(
    "immutable snapshot updatedAt equals createdSnapshot updatedAt",
    snapshot.updatedAt,
    createdSnapshot.updatedAt,
  );
  TestValidator.equals(
    "immutable snapshot createdAt equals updatedAt",
    snapshot.createdAt,
    snapshot.updatedAt,
  );
  TestValidator.predicate(
    "nested parent seller profile relation is present",
    snapshot.sellerProfile !== null && snapshot.sellerProfile !== undefined,
  );
}
