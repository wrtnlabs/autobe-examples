import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_auth_seller_login(connection: api.IConnection) {
  const output: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: typia.random<IShoppingMallSeller.ILogin>(),
    });
  typia.assert(output);
}
