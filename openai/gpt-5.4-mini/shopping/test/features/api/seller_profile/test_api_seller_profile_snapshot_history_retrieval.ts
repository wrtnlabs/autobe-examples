import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshot_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(authorized);
  TestValidator.predicate(
    "seller authorization should return an access token",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "seller authorization should return a refresh token",
    authorized.token.refresh.length > 0,
  );
  const request: IShoppingMallSellerProfileSnapshot.IRequest = {
    page: 1,
    limit: 100,
  };
  const snapshots =
    await api.functional.shoppingMall.seller.seller_profiles.snapshots.index(
      sellerConnection,
      {
        sellerProfileId: authorized.id,
        body: request,
      },
    );
  typia.assert(snapshots);
  TestValidator.predicate(
    "snapshot history response should contain pagination metadata",
    snapshots.pagination.current >= 1 && snapshots.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "snapshot history response should contain data array",
    Array.isArray(snapshots.data),
  );
}
