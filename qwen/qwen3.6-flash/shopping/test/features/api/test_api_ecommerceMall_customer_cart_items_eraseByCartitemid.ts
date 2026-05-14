import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_customer_cart_items_eraseByCartitemid(
  connection: api.IConnection,
) {
  const output =
    await api.functional.ecommerceMall.customer.cart_items.eraseByCartitemid(
      connection,
      {
        cartItemId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
