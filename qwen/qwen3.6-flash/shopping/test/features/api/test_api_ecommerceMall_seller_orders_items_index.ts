import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import typia from "typia";

export async function test_api_ecommerceMall_seller_orders_items_index(
  connection: api.IConnection,
) {
  const output: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.seller.orders.items.index(connection, {
      body: typia.random<IEcommerceMallOrderItem.IRequest>(),
    });
  typia.assert(output);
}
