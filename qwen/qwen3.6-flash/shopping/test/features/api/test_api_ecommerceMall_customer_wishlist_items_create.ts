import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import typia from "typia";

export async function test_api_ecommerceMall_customer_wishlist_items_create(
  connection: api.IConnection,
) {
  const output: IEcommerceMallWishlistItem =
    await api.functional.ecommerceMall.customer.wishlist_items.create(
      connection,
      {
        body: typia.random<IEcommerceMallWishlistItem.ICreate>(),
      },
    );
  typia.assert(output);
}
