import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function test_api_seller_profile_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Administrator join
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.auth.administrator.join(adminConnection, {
    body: {},
  });
  // Administrator login
  await authorize_administrator_login(adminConnection, {
    body: {},
  });
  // Seller join
  const sellerConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.auth.seller.join(sellerConnection, {
    body: {},
  });
  // Seller login
  await authorize_seller_login(sellerConnection, {
    body: {},
  });
  // Use a valid UUID that does not exist
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // Test as administrator: expect 404 Not Found
  await TestValidator.httpError(
    "fetch non-existent snapshot as admin should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.sellerProfileSnapshots.at(
        adminConnection,
        {
          id: nonExistentId,
        },
      );
    },
  );
  // Test as seller: expect 404 Not Found
  await TestValidator.httpError(
    "fetch non-existent snapshot as seller should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.sellerProfileSnapshots.at(
        sellerConnection,
        {
          id: nonExistentId,
        },
      );
    },
  );
}
