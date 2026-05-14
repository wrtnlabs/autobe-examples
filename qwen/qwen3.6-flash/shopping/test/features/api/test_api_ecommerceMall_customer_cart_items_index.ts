import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IPageIEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCartItem";
import typia from "typia";

export async function test_api_ecommerceMall_customer_cart_items_index(
  connection: api.IConnection,
) {
  const output: IPageIEcommerceMallCartItem.ISummary =
    await api.functional.ecommerceMall.customer.cart_items.index(connection, {
      body: typia.random<IEcommerceMallCartItem.IRequest>(),
    });
  typia.assert(output);
}
