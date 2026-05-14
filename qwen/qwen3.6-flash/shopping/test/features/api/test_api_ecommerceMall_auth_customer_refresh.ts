import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import typia from "typia";

export async function test_api_ecommerceMall_auth_customer_refresh(
  connection: api.IConnection,
) {
  const output: IEcommerceMallCustomer.IAuthorized =
    await api.functional.ecommerceMall.auth.customer.refresh(connection, {
      body: typia.random<IEcommerceMallCustomer.IRefresh>(),
    });
  typia.assert(output);
}
