import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_customer_wishlist_items_erase(
  connection: api.IConnection,
) {
  const output =
    await api.functional.ecommerceMall.customer.wishlist_items.erase(
      connection,
      {
        wishlistItemId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
