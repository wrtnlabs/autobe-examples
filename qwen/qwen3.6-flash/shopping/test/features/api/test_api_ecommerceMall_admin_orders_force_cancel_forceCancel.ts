import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_admin_orders_force_cancel_forceCancel(
  connection: api.IConnection,
) {
  const output: IEcommerceMallOrder =
    await api.functional.ecommerceMall.admin.orders.force_cancel.forceCancel(
      connection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IEcommerceMallOrder.IForceCancel>(),
      },
    );
  typia.assert(output);
}
