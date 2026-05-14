import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_customer_cart_items_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallCartItem =
    await api.functional.ecommerceMall.customer.cart_items.at(connection, {
      cartItemId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
