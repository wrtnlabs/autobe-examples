import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import typia from "typia";

export async function test_api_ecommerceMall_customer_cart_items_create(
  connection: api.IConnection,
) {
  const output: IEcommerceMallCartItem =
    await api.functional.ecommerceMall.customer.cart_items.create(connection, {
      body: typia.random<IEcommerceMallCartItem.ICreate>(),
    });
  typia.assert(output);
}
