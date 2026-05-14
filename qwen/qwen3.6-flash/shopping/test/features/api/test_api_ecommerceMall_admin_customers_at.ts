import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_admin_customers_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallCustomer =
    await api.functional.ecommerceMall.admin.customers.at(connection, {
      customerId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
