import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import typia from "typia";

export async function test_api_ecommerceMall_auth_customer_join(
  connection: api.IConnection,
) {
  const output: IEcommerceMallCustomer.IAuthorized =
    await api.functional.ecommerceMall.auth.customer.join(connection, {
      body: typia.random<IEcommerceMallCustomer.IJoin>(),
    });
  typia.assert(output);
}
