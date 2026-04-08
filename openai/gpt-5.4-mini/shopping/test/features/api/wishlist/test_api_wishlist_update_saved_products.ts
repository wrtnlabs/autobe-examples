import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
import type { IMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { prepare_random_mall_platform_wishlist_item } from "../../../prepare/prepare_random_mall_platform_wishlist_item";

export async function test_api_wishlist_update_saved_products(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/join",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(joined);
  const body = {
    products: [],
  } satisfies IMallPlatformWishlist.IUpdate;
  const wishlist = await api.functional.mallPlatform.customer.wishlists.update(
    customerConnection,
    {
      body,
    },
  );
  typia.assert(wishlist);
  TestValidator.equals(
    "wishlist owner is the authenticated customer",
    wishlist.customer.id,
    joined.id,
  );
  TestValidator.equals(
    "wishlist owner email matches authenticated customer",
    wishlist.customer.email,
    joined.email,
  );
  TestValidator.equals(
    "saved products are replaced by the requested empty set",
    wishlist.wishlistItems.length,
    0,
  );
  TestValidator.equals(
    "wishlist items are persisted as an empty list",
    wishlist.wishlistItems,
    [],
  );
  TestValidator.predicate(
    "wishlist container exists after update",
    wishlist.id.length > 0,
  );
}
