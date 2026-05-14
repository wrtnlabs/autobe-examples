import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_admin_orders_orderItems_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallOrderItem =
    await api.functional.ecommerceMall.admin.orders.orderItems.at(connection, {
      orderId: typia.random<string & tags.Format<"uuid">>(),
      orderItemId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
