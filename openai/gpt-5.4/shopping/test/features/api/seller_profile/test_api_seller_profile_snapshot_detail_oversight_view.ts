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

export async function test_api_seller_profile_snapshot_detail_oversight_view(
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
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  let firstSnapshot: IShoppingMallSellerProfileSnapshot | null = null;
  try {
    firstSnapshot =
      await api.functional.shoppingMall.administrator.seller_profiles.snapshots.at(
        administratorConnection,
        {
          sellerProfileId,
          snapshotId,
        },
      );
  } catch (exp) {
    if (typia.is<api.HttpError>(exp)) {
      TestValidator.predicate(
        "missing or inaccessible snapshot is reported as an expected client error",
        exp.status === 403 || exp.status === 404,
      );
      return;
    }
    throw exp;
  }
  const snapshot = typia.assert(firstSnapshot);
  TestValidator.equals(
    "snapshot id matches requested id",
    snapshot.id,
    snapshotId,
  );
  TestValidator.equals(
    "snapshot belongs to requested seller profile",
    snapshot.sellerProfile.id,
    sellerProfileId,
  );
  TestValidator.predicate(
    "nested seller profile context is present for oversight review",
    snapshot.sellerProfile.id.length > 0 &&
      snapshot.sellerProfile.seller.id.length > 0,
  );
  TestValidator.equals(
    "immutable snapshot updatedAt equals createdAt",
    snapshot.updatedAt,
    snapshot.createdAt,
  );
  const secondSnapshot =
    await api.functional.shoppingMall.administrator.seller_profiles.snapshots.at(
      administratorConnection,
      {
        sellerProfileId,
        snapshotId,
      },
    );
  typia.assert(secondSnapshot);
  TestValidator.equals(
    "repeated retrieval returns the identical historical snapshot",
    secondSnapshot,
    snapshot,
  );
  TestValidator.equals(
    "preserved shop name remains stable across repeated retrievals",
    secondSnapshot.shopName,
    snapshot.shopName,
  );
  TestValidator.equals(
    "preserved shop description remains stable across repeated retrievals",
    secondSnapshot.shopDescription,
    snapshot.shopDescription,
  );
  TestValidator.equals(
    "preserved logo URI remains stable across repeated retrievals",
    secondSnapshot.logoUri,
    snapshot.logoUri,
  );
  TestValidator.equals(
    "change summary remains stable across repeated retrievals",
    secondSnapshot.changedSummary,
    snapshot.changedSummary,
  );
  TestValidator.equals(
    "change timestamp remains stable across repeated retrievals",
    secondSnapshot.changedAt,
    snapshot.changedAt,
  );
  TestValidator.equals(
    "created timestamp remains stable across repeated retrievals",
    secondSnapshot.createdAt,
    snapshot.createdAt,
  );
  TestValidator.equals(
    "updated timestamp remains stable across repeated retrievals",
    secondSnapshot.updatedAt,
    snapshot.updatedAt,
  );
}
