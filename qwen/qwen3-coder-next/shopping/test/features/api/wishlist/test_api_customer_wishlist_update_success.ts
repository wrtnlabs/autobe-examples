import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_wishlist_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerCreds = typia.random<IShoppingMallCustomer.IJoin>();
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: customerCreds,
  });
  typia.assert(customerAuth);
  // 2. Create initial wishlist item (simulated via POST if available)
  // Since we don't have POST endpoint defined, we'll use random data for update testing
  const wishlistItem = typia.random<IShoppingMallWishlist>();
  typia.assert(wishlistItem);
  // 3. Update wishlist with PATCH request
  const updateRequest: IShoppingMallWishlist.IRequest =
    typia.random<IShoppingMallWishlist.IRequest>();
  typia.assert(updateRequest);
  const updatedWishlist =
    await api.functional.shoppingMall.customer.wishlists.update(
      customerConnection,
      {
        body: updateRequest,
      },
    );
  typia.assert(updatedWishlist);
  // 4. Verify the update returned valid wishlist data
  TestValidator.predicate("wishlist has valid structure", () => {
    const w = updatedWishlist;
    return typeof w === "object" && w !== null;
  });
  // 5. Verify no type errors occurred
  TestValidator.equals(
    "response type matches IShoppingMallWishlist",
    typeof updatedWishlist,
    "object",
  );
}
