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

export async function test_api_wishlist_update_deduplicates_products(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test wishlist replacement deduplicates repeated product references.
   *
   * This scenario validates that the authenticated customer's wishlist update
   * treats the wishlist body as a unique set of products rather than storing
   * duplicate saved entries for the same product reference.
   *
   * 1. Register a customer and create an authenticated customer connection.
   * 2. Submit a wishlist replacement request containing repeated references.
   * 3. Validate the response is a wishlist object owned by the customer.
   * 4. Verify the saved wishlist items are normalized so duplicate references do
   *    not appear as duplicated saved entries in the response payload.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const repeatedProductId = typia.random<string & tags.Format<"uuid">>();
  const output = await api.functional.mallPlatform.customer.wishlists.update(
    customerConnection,
    {
      body: {
        products: [
          {
            product_id: repeatedProductId,
          } satisfies IMallPlatformWishlistItem.ICreate,
          {
            product_id: repeatedProductId,
          } satisfies IMallPlatformWishlistItem.ICreate,
          {
            product_id: repeatedProductId,
          } satisfies IMallPlatformWishlistItem.ICreate,
        ],
      } satisfies IMallPlatformWishlist.IUpdate,
    },
  );
  typia.assert(output);
  TestValidator.equals(
    "wishlist belongs to the authenticated customer",
    output.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "duplicate product references are normalized to a single saved product",
    output.wishlistItems.length,
    1,
  );
  TestValidator.equals(
    "the persisted wishlist contains the requested product once",
    output.wishlistItems[0]?.product.id,
    repeatedProductId,
  );
}
