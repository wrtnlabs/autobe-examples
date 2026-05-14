import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_admin_orders_order_items_index(
  connection: api.IConnection,
) {
  const output: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.admin.orders.order_items.index(
      connection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IEcommerceMallOrderItem.IRequest>(),
      },
    );
  typia.assert(output);
}
