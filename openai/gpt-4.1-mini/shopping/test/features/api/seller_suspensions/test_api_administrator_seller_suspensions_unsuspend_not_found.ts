import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * This test scenario validates the administrator's behavior when attempting to unsuspend a seller who is not currently suspended.
 * It ensures the system returns an error response indicating no active suspension exists for the specified sellerId.
 * It confirms that administrator authentication is required before making this request.
 */
export async function test_api_administrator_seller_suspensions_unsuspend_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create an administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {} satisfies IShoppingMallAdministrator.IJoin,
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Attempt to unsuspend a seller with a random UUID (not suspended)
  const randomSellerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Expect an error response indicating no active suspension exists
  await TestValidator.httpError(
    "unsuspend non-suspended seller",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.seller_suspensions.unsuspend(
        adminConnection,
        { sellerId: randomSellerId },
      );
    },
  );
}
