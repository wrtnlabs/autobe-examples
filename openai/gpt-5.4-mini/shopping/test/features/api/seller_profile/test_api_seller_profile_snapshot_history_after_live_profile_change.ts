import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
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

export async function test_api_seller_profile_snapshot_history_after_live_profile_change(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await api.functional.shoppingMall.auth.administrator.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(admin);
  const snapshotHistory =
    await api.functional.shoppingMall.administrator.seller_profiles.snapshots.index(
      adminConnection,
      {
        sellerProfileId: admin.id,
        body: {
          page: 1,
          limit: 20,
          sort: "created_at:desc",
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshotHistory);
  TestValidator.equals(
    "pagination current page",
    snapshotHistory.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    snapshotHistory.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    snapshotHistory.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    snapshotHistory.pagination.pages >= 0,
  );
  for (const snapshot of snapshotHistory.data) {
    TestValidator.predicate(
      "snapshot shop name is present",
      snapshot.shopName.length >= 0,
    );
    TestValidator.predicate(
      "snapshot shop description is present",
      snapshot.shopDescription.length >= 0,
    );
    if (snapshot.logoImageUri !== null) {
      TestValidator.predicate(
        "snapshot logo image uri is preserved",
        snapshot.logoImageUri.length > 0,
      );
    }
    TestValidator.predicate(
      "snapshot createdAt is present",
      snapshot.createdAt.length > 0,
    );
    TestValidator.predicate(
      "nested seller profile summary is present",
      snapshot.sellerProfile.shopName.length >= 0,
    );
  }
}
