import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_auth_customer_refresh(
  connection: api.IConnection,
) {
  const output: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.refresh(connection, {
      body: typia.random<IShoppingMallCustomer.IRefresh>(),
    });
  typia.assert(output);
}
