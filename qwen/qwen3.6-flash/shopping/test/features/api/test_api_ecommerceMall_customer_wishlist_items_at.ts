import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_customer_wishlist_items_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallWishlistItem =
    await api.functional.ecommerceMall.customer.wishlist_items.at(connection, {
      wishlistItemId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
