import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_customer_wishlist_items_update(
  connection: api.IConnection,
) {
  const output: IEcommerceMallWishlistItem =
    await api.functional.ecommerceMall.customer.wishlist_items.update(
      connection,
      {
        wishlistItemId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IEcommerceMallWishlistItem.IUpdate>(),
      },
    );
  typia.assert(output);
}
