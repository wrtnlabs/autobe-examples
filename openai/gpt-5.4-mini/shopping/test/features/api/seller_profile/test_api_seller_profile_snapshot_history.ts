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

export async function test_api_seller_profile_snapshot_history(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  const sellerProfileId = typia.random<string & tags.Format<"uuid">>();
  const page = 1;
  const limit = 2;
  const response =
    await api.functional.shoppingMall.administrator.seller_profiles.snapshots.index(
      adminConnection,
      {
        sellerProfileId,
        body: {
          page,
          limit,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "pagination current page should match requested page",
    response.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit should match requested limit",
    response.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination record count should be non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages should be non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "snapshot list should not exceed requested limit",
    response.data.length <= limit,
  );
  TestValidator.predicate(
    "every snapshot should belong to the requested seller profile",
    response.data.every(
      (snapshot) => snapshot.sellerProfile.id === sellerProfileId,
    ),
  );
  TestValidator.predicate(
    "snapshots should be sorted from newest to oldest by default",
    response.data.every(
      (snapshot, index, array) =>
        index === 0 || array[index - 1].createdAt >= snapshot.createdAt,
    ),
  );
}
