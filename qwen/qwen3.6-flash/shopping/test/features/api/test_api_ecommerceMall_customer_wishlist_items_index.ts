import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IPageIEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlistItem";
import typia from "typia";

export async function test_api_ecommerceMall_customer_wishlist_items_index(
  connection: api.IConnection,
) {
  const output: IPageIEcommerceMallWishlistItem.ISummary =
    await api.functional.ecommerceMall.customer.wishlist_items.index(
      connection,
      {
        body: typia.random<IEcommerceMallWishlistItem.IRequest>(),
      },
    );
  typia.assert(output);
}
