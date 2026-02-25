import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_wishlist_unavailable_product_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: (RandomGenerator.alphabets(5) + "@test.com") satisfies string &
        tags.MinLength<1> &
        tags.MaxLength<255> &
        tags.Format<"email">,
      password: "1234" satisfies string &
        tags.MinLength<8> &
        tags.MaxLength<128> &
        tags.Format<"password">,
      display_name: RandomGenerator.name(),
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/referrer" satisfies string &
        tags.Format<"uri">,
    },
  });
  typia.assert(customer);
  // 2. Create pagination request for wishlist
  const wishlistRequest =
    typia.random<IPageIShoppingMallWishlistItem.IRequest>();
  // 3. Get wishlist
  const wishlist = await api.functional.shoppingMall.customer.wishlists.index(
    customerConnection,
    { body: wishlistRequest },
  );
  typia.assert(wishlist);
  // 4. Test wishlist items structure
  for (const item of wishlist.data) {
    typia.assert(item);
    typia.assert(item.product);
    typia.assert(item.seller);
  }
}
