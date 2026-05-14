import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_admin_orders_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallOrder =
    await api.functional.ecommerceMall.admin.orders.at(connection, {
      orderId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
