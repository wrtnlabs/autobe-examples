import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_admin_orders_forceRefund(
  connection: api.IConnection,
) {
  const output: IEcommerceMallOrder =
    await api.functional.ecommerceMall.admin.orders.forceRefund(connection, {
      orderId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IEcommerceMallOrder.IForceRefund>(),
    });
  typia.assert(output);
}
