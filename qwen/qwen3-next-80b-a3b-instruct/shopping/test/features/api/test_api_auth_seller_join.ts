import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_auth_seller_join(connection: api.IConnection) {
  const output: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: typia.random<IShoppingMallSeller.ICreate>(),
    });
  typia.assert(output);
}
