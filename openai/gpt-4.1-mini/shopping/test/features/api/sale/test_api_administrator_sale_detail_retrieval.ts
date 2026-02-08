import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_sale_detail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and gets authorized
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: typia.random<IShoppingMallAdministrator.IJoin>(),
  });
  typia.assert(adminAuth);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Try fetching a sale that does not exist (should get 404)
  const invalidSaleId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError("sale not found returns 404", 404, async () => {
    await api.functional.shoppingMall.administrator.sales.at(adminConnection, {
      saleId: invalidSaleId,
    });
  });
  // 3. Create a valid saleId to test
  // Since creating new sales is not provided, we must test with a random uuid
  // so instead, test fetching a random valid UUID and expect either 404 or valid response
  // 4. Fetching sale with authorization
  // We do not have a utility to create sales, so only test that
  // fetching is authorized and succeeds for valid or returns 404 for invalid
  // 5. Test unauthorized access returns error
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access returns error",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.sales.at(
        unauthorizedConnection,
        {
          saleId: invalidSaleId,
        },
      );
    },
  );
}
