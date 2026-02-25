import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSuspension";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_seller_unsuspension_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registers and authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "strongpassword",
    },
  });
  typia.assert(adminAuth);
  // Update adminConnection with authorization header
  adminConnection.headers = {
    Authorization: adminAuth.token.access,
  };
  // 2. Attempt to unsuspend a non-existing or not suspended sellerId
  const fakeSellerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Expect 404 Not Found error for unsuspension attempt
  await TestValidator.httpError(
    "unsuspend with non-existing or non-suspended sellerId",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.seller_suspensions.unsuspend(
        adminConnection,
        { sellerId: fakeSellerId },
      );
    },
  );
  // 4. Check authorization enforcement
  // Use base (unauthorized) connection
  await TestValidator.httpError(
    "unsuspend without admin authorization",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.seller_suspensions.unsuspend(
        connection,
        { sellerId: fakeSellerId },
      );
    },
  );
}
