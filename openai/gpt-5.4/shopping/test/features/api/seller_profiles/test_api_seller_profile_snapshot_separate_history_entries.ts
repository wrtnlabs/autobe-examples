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

export async function test_api_seller_profile_snapshot_separate_history_entries(
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
  const firstChangedAt = new Date().toISOString();
  const secondChangedAt = new Date(Date.now() + 60000).toISOString();
  const firstBody = {
    shopName: `shop-${RandomGenerator.alphabets(8)}`,
    shopDescription: RandomGenerator.paragraph({ sentences: 3 }),
    logoUri: typia.random<string & tags.Format<"uri">>(),
    changedSummary: `accepted-profile-edit-${RandomGenerator.alphabets(6)}`,
    changedAt: firstChangedAt,
  } satisfies IShoppingMallSellerProfileSnapshot.ICreate;
  const firstSnapshot =
    await generate_random_shopping_mall_administrator_seller_profiles_snapshots_create(
      administratorConnection,
      {
        params: {
          sellerProfileId,
        },
        body: firstBody,
      },
    );
  typia.assert(firstSnapshot);
  const secondBody = {
    shopName: firstBody.shopName,
    shopDescription: firstBody.shopDescription,
    logoUri: firstBody.logoUri,
    changedSummary: `accepted-profile-edit-${RandomGenerator.alphabets(6)}`,
    changedAt: secondChangedAt,
  } satisfies IShoppingMallSellerProfileSnapshot.ICreate;
  const secondSnapshot =
    await generate_random_shopping_mall_administrator_seller_profiles_snapshots_create(
      administratorConnection,
      {
        params: {
          sellerProfileId,
        },
        body: secondBody,
      },
    );
  typia.assert(secondSnapshot);
  TestValidator.notEquals(
    "separate snapshot ids are preserved",
    firstSnapshot.id,
    secondSnapshot.id,
  );
  TestValidator.equals(
    "first snapshot changedSummary matches first history entry",
    firstSnapshot.changedSummary,
    firstBody.changedSummary,
  );
  TestValidator.equals(
    "first snapshot changedAt matches first history entry",
    firstSnapshot.changedAt,
    firstBody.changedAt,
  );
  TestValidator.equals(
    "second snapshot changedSummary matches second history entry",
    secondSnapshot.changedSummary,
    secondBody.changedSummary,
  );
  TestValidator.equals(
    "second snapshot changedAt matches second history entry",
    secondSnapshot.changedAt,
    secondBody.changedAt,
  );
  TestValidator.equals(
    "later snapshot creation does not alter first snapshot changedSummary",
    firstSnapshot.changedSummary,
    firstBody.changedSummary,
  );
  TestValidator.equals(
    "later snapshot creation does not alter first snapshot changedAt",
    firstSnapshot.changedAt,
    firstBody.changedAt,
  );
  TestValidator.equals(
    "first snapshot preserved shopName remains independent",
    firstSnapshot.shopName,
    firstBody.shopName,
  );
  TestValidator.equals(
    "first snapshot preserved shopDescription remains independent",
    firstSnapshot.shopDescription,
    firstBody.shopDescription ?? null,
  );
  TestValidator.equals(
    "first snapshot preserved logoUri remains independent",
    firstSnapshot.logoUri,
    firstBody.logoUri ?? null,
  );
  TestValidator.equals(
    "second snapshot preserved shopName matches second history payload",
    secondSnapshot.shopName,
    secondBody.shopName,
  );
  TestValidator.equals(
    "second snapshot preserved shopDescription matches second history payload",
    secondSnapshot.shopDescription,
    secondBody.shopDescription ?? null,
  );
  TestValidator.equals(
    "second snapshot preserved logoUri matches second history payload",
    secondSnapshot.logoUri,
    secondBody.logoUri ?? null,
  );
  TestValidator.equals(
    "both snapshots belong to the same seller profile",
    firstSnapshot.sellerProfile.id,
    secondSnapshot.sellerProfile.id,
  );
}
