import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfile";
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

export async function test_api_seller_profile_snapshot_append_only_history(
  connection: api.IConnection,
): Promise<void> {
  const superAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_super_administrator_join(superAdministratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdministrator.IJoin,
  });
  const sellerConnection: api.IConnection = {
    host: connection.host,
  };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const profilePage = await api.functional.shoppingMall.seller_profiles.index(
    sellerConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallSellerProfile.IRequest,
    },
  );
  typia.assert(profilePage);
  const matchedSellerProfile = profilePage.data.find(
    (profile) => profile.seller.id === sellerAuth.id,
  );
  TestValidator.predicate(
    "registered seller profile exists in public listing",
    matchedSellerProfile !== undefined,
  );
  const sellerProfile = typia.assert(matchedSellerProfile!);
  const historicalState = {
    shopName: RandomGenerator.name(2),
    shopDescription: RandomGenerator.paragraph({ sentences: 4 }),
    logoUri: typia.random<string & tags.Format<"uri">>(),
  };
  const firstSnapshotBody = {
    ...historicalState,
    changedSummary: `append-only history entry ${RandomGenerator.alphabets(8)} first`,
    changedAt: new Date().toISOString(),
  } satisfies IShoppingMallSellerProfileSnapshot.ICreate;
  const secondSnapshotBody = {
    ...historicalState,
    changedSummary: `append-only history entry ${RandomGenerator.alphabets(8)} second`,
    changedAt: new Date(Date.now() + 1000).toISOString(),
  } satisfies IShoppingMallSellerProfileSnapshot.ICreate;
  const firstSnapshot =
    await generate_random_shopping_mall_super_administrator_seller_profiles_snapshots_create(
      superAdministratorConnection,
      {
        params: {
          sellerProfileId: sellerProfile.id,
        },
        body: firstSnapshotBody,
      },
    );
  typia.assert(firstSnapshot);
  const secondSnapshot =
    await generate_random_shopping_mall_super_administrator_seller_profiles_snapshots_create(
      superAdministratorConnection,
      {
        params: {
          sellerProfileId: sellerProfile.id,
        },
        body: secondSnapshotBody,
      },
    );
  typia.assert(secondSnapshot);
  TestValidator.notEquals(
    "snapshot ids are distinct append-only entries",
    firstSnapshot.id,
    secondSnapshot.id,
  );
  TestValidator.notEquals(
    "snapshot creation timestamps are distinct",
    firstSnapshot.createdAt,
    secondSnapshot.createdAt,
  );
  TestValidator.equals(
    "first snapshot belongs to same seller profile",
    firstSnapshot.sellerProfile.id,
    sellerProfile.id,
  );
  TestValidator.equals(
    "second snapshot belongs to same seller profile",
    secondSnapshot.sellerProfile.id,
    sellerProfile.id,
  );
  TestValidator.equals(
    "first snapshot preserves shop name",
    firstSnapshot.shopName,
    firstSnapshotBody.shopName,
  );
  TestValidator.equals(
    "first snapshot preserves shop description",
    firstSnapshot.shopDescription,
    firstSnapshotBody.shopDescription ?? null,
  );
  TestValidator.equals(
    "first snapshot preserves logo uri",
    firstSnapshot.logoUri,
    firstSnapshotBody.logoUri ?? null,
  );
  TestValidator.equals(
    "first snapshot preserves changed summary",
    firstSnapshot.changedSummary,
    firstSnapshotBody.changedSummary,
  );
  TestValidator.equals(
    "first snapshot preserves changed at",
    firstSnapshot.changedAt,
    firstSnapshotBody.changedAt,
  );
  TestValidator.equals(
    "second snapshot preserves shop name",
    secondSnapshot.shopName,
    secondSnapshotBody.shopName,
  );
  TestValidator.equals(
    "second snapshot preserves shop description",
    secondSnapshot.shopDescription,
    secondSnapshotBody.shopDescription ?? null,
  );
  TestValidator.equals(
    "second snapshot preserves logo uri",
    secondSnapshot.logoUri,
    secondSnapshotBody.logoUri ?? null,
  );
  TestValidator.equals(
    "second snapshot preserves changed summary",
    secondSnapshot.changedSummary,
    secondSnapshotBody.changedSummary,
  );
  TestValidator.equals(
    "second snapshot preserves changed at",
    secondSnapshot.changedAt,
    secondSnapshotBody.changedAt,
  );
}
