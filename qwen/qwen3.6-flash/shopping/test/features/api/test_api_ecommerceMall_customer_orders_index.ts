import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import typia from "typia";

export async function test_api_ecommerceMall_customer_orders_index(
  connection: api.IConnection,
) {
  const output: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.customer.orders.index(connection, {
      body: typia.random<IEcommerceMallOrder.IRequest>(),
    });
  typia.assert(output);
}
