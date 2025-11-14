import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_auth_customer_login(
  connection: api.IConnection,
) {
  const output: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: typia.random<IShoppingMallCustomer.IRequest>(),
    });
  typia.assert(output);
}
