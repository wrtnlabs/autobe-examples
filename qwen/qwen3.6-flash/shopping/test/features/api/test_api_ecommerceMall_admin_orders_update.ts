import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_admin_orders_update(
  connection: api.IConnection,
) {
  const output: IEcommerceMallOrder =
    await api.functional.ecommerceMall.admin.orders.update(connection, {
      orderId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IEcommerceMallOrder.IUpdate>(),
    });
  typia.assert(output);
}
