import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_sale_unit_erase_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Attempt without authentication
  await TestValidator.httpError(
    "unauthorized erase without auth",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.seller.sale_units.erase(connection, {
        unitId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
  // Attempt with a seller account but trying to erase a unit with a fake ID that should fail but still test authorization
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  // Set the Authorization header with obtained token
  sellerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Use a random UUID for unitId which likely does not exist
  await TestValidator.httpError(
    "unauthorized erase with valid seller auth but invalid unitId",
    [404, 401, 403],
    async () => {
      await api.functional.shoppingMall.seller.sale_units.erase(
        sellerConnection,
        {
          unitId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
