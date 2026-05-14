import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_customer_wishlists_update(
  connection: api.IConnection,
) {
  const output: IEcommerceMallWishlist =
    await api.functional.ecommerceMall.customer.wishlists.update(connection, {
      wishlistId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IEcommerceMallWishlist.IUpdate>(),
    });
  typia.assert(output);
}
