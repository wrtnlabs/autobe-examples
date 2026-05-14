import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IPageIEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomer";
import typia from "typia";

export async function test_api_ecommerceMall_admin_customers_index(
  connection: api.IConnection,
) {
  const output: IPageIEcommerceMallCustomer.ISummary =
    await api.functional.ecommerceMall.admin.customers.index(connection, {
      body: typia.random<IEcommerceMallCustomer.IRequest>(),
    });
  typia.assert(output);
}
