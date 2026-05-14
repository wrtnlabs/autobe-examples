import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import { IPageIEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemSnapshot";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_admin_orders_order_items_snapshots_index(
  connection: api.IConnection,
) {
  const output: IPageIEcommerceMallOrderItemSnapshot.ISummary =
    await api.functional.ecommerceMall.admin.orders.order_items.snapshots.index(
      connection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IEcommerceMallOrderItemSnapshot.IRequest>(),
      },
    );
  typia.assert(output);
}
