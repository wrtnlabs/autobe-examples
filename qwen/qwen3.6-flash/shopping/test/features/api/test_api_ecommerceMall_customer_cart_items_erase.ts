import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

export async function test_api_ecommerceMall_customer_cart_items_erase(
  connection: api.IConnection,
) {
  const output =
    await api.functional.ecommerceMall.customer.cart_items.erase(connection);
  typia.assert(output);
}
