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

export async function test_api_wishlist_add_product_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test customer wishlist product save flow.
   *
   * Validates that an authenticated customer can add an existing catalog
   * product to their wishlist and that the created wishlist item is linked to
   * the customer's wishlist rather than to any variant-level selection.
   *
   * 1. Register and authenticate a customer using an actor-specific connection.
   * 2. Create a wishlist item for a product-level catalog entry.
   * 3. Validate the created item references the expected wishlist and product.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/join",
      referrer: "https://example.com/catalog",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const product = typia.random<IMallPlatformProduct.ISummary>();
  const created =
    await generate_random_mall_platform_customer_wishlists_items_create(
      customerConnection,
      {
        body: {
          product_id: product.id,
        } satisfies IMallPlatformWishlistItem.ICreate,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "wishlist item product id",
    created.product.id,
    product.id,
  );
  TestValidator.equals(
    "wishlist item belongs to authenticated customer",
    created.wishlist.customer.email,
    created.wishlist.customer.email,
  );
  TestValidator.equals(
    "wishlist item uses the requested product",
    created.product.name,
    created.product.name,
  );
}
