import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import typia from "typia";

export async function test_api_ecommerceMall_customer_orders_create(
  connection: api.IConnection,
) {
  const output: IEcommerceMallOrder =
    await api.functional.ecommerceMall.customer.orders.create(connection, {
      body: typia.random<IEcommerceMallOrder.ICreate>(),
    });
  typia.assert(output);
}
