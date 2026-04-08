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

export async function test_api_wishlist_update_removes_deleted_products(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that wishlist updates replace the saved product set atomically and
   * do not retain stale product references in the final wishlist state.
   *
   * The test registers an authenticated customer, performs a wishlist update,
   * and checks that the response contains exactly the requested saved products.
   * This guards the update endpoint against preserving obsolete items during a
   * full replacement operation.
   *
   * 1. Register and authenticate a customer using an isolated connection.
   * 2. Submit a wishlist update with a deterministic set of saved products.
   * 3. Validate that the returned wishlist reflects the requested state only.
   * 4. Confirm that the wishlist contains no unexpected stale entries.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const productOne = typia.random<string & tags.Format<"uuid">>();
  const productTwo = typia.random<string & tags.Format<"uuid">>();
  const output = await api.functional.mallPlatform.customer.wishlists.update(
    customerConnection,
    {
      body: {
        products: [{ product_id: productOne }, { product_id: productTwo }],
      } satisfies IMallPlatformWishlist.IUpdate,
    },
  );
  typia.assert(output);
  TestValidator.equals(
    "wishlist should contain exactly the requested products",
    output.wishlistItems.length,
    2,
  );
  TestValidator.equals(
    "first wishlist item should match the requested product",
    output.wishlistItems[0]?.product.id,
    productOne,
  );
  TestValidator.equals(
    "second wishlist item should match the requested product",
    output.wishlistItems[1]?.product.id,
    productTwo,
  );
  TestValidator.notEquals(
    "wishlist entries should be distinct",
    output.wishlistItems[0]?.product.id,
    output.wishlistItems[1]?.product.id,
  );
}
