import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshot";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_customer_orders_order_items_snapshots_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallSnapshot =
    await api.functional.ecommerceMall.customer.orders.order_items.snapshots.at(
      connection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
