import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import { IPageIEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlist";
import typia from "typia";

export async function test_api_ecommerceMall_customer_wishlists_index(
  connection: api.IConnection,
) {
  const output: IPageIEcommerceMallWishlist.ISummary =
    await api.functional.ecommerceMall.customer.wishlists.index(connection, {
      body: typia.random<IEcommerceMallWishlist.IRequest>(),
    });
  typia.assert(output);
}
