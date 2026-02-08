import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test retrieving an order item snapshot by a valid existing snapshot ID as an authorized administrator.
 *
 * Steps:
 * 1. Administrator signs up using a random admin join request.
 * 2. Administrator connection is authorized with the token from signup.
 * 3. Attempt to retrieve an order item snapshot with a random but valid UUID.
 * 4. Validate the response schema with typia.assert.
 * 5. Attempt to retrieve a snapshot with a non-existent UUID.
 * 6. Validate that the response throws a HTTP 404 error.
 */
export async function test_api_order_item_snapshot_retrieve_by_admin_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: typia.random<IShoppingMallAdministrator.IJoin>(),
  });
  // Set authorization header for future requests
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Try to get an order item snapshot with a valid id
  const validId = typia.random<string & tags.Format<"uuid">>();
  const snapshot = await api.functional.shoppingMall.orderItemSnapshots.at(
    adminConnection,
    { id: validId },
  );
  // Assert the valid response
  typia.assert(snapshot);
  // 3. Try to get an order item snapshot with a non-existent id (random UUID)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent snapshot id returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.orderItemSnapshots.at(adminConnection, {
        id: nonExistentId,
      });
    },
  );
}
