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
import { generate_random_mall_platform_customer_wishlists_items_create } from "../../../generate/generate_random_mall_platform_customer_wishlists_items_create";
import { prepare_random_mall_platform_wishlist_item } from "../../../prepare/prepare_random_mall_platform_wishlist_item";

export async function test_api_wishlist_duplicate_product_rejected(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test duplicate wishlist product save rejection for authenticated customers.
   *
   * Validates that an authenticated customer can save a product to the wishlist
   * once, while a repeated save request for the same product is rejected as a
   * duplicate business conflict.
   *
   * 1. Register and authenticate a customer using a dedicated connection.
   * 2. Save one product to the customer's wishlist.
   * 3. Attempt to save the same product again and verify the request is rejected.
   * 4. Confirm the original created wishlist item is preserved.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const first =
    await generate_random_mall_platform_customer_wishlists_items_create(
      customerConnection,
      {
        body: {
          product_id: productId,
        } satisfies IMallPlatformWishlistItem.ICreate,
      },
    );
  typia.assert(first);
  await TestValidator.error(
    "duplicate wishlist product save should be rejected",
    async () => {
      await generate_random_mall_platform_customer_wishlists_items_create(
        customerConnection,
        {
          body: {
            product_id: productId,
          } satisfies IMallPlatformWishlistItem.ICreate,
        },
      );
    },
  );
  TestValidator.equals(
    "first wishlist item product is preserved",
    first.product.id,
    productId,
  );
}
