import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_seller_orders_order_items_update(
  connection: api.IConnection,
) {
  const output: IEcommerceMallOrderItem =
    await api.functional.ecommerceMall.seller.orders.order_items.update(
      connection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IEcommerceMallOrderItem.IUpdate>(),
      },
    );
  typia.assert(output);
}
