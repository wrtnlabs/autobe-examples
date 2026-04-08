import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import type { IEcommerceWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlist";
import type { IEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_customer_wishlists_items_create } from "../../../generate/generate_random_ecommerce_customer_wishlists_items_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";
import { prepare_random_ecommerce_wishlist_item } from "../../../prepare/prepare_random_ecommerce_wishlist_item";

/**
 * Test unauthorized wishlist item removal by another customer.
 *
 * Validates the authorization boundary where an authenticated customer attempts to remove a wishlist item from another customer's wishlist. This test ensures proper access control prevents cross-customer wishlist manipulation.
 *
 * The scenario establishes two separate customer accounts and a seller account, then verifies that Customer1 cannot access or modify Customer2's wishlist items even when they are both authenticated customers.
 *
 * 1. Customer1 registers and authenticates with the system.
 * 2. Customer2 registers and authenticates with the system.
 * 3. Seller registers and authenticates with the system.
 * 4. Seller creates a product available for purchase.
 * 5. Customer2 adds the product to their own wishlist.
 * 6. Customer1 attempts to remove Customer2's wishlist item using Customer2's wishlist ID and item ID.
 * 7. Validates the operation returns 403 Forbidden error.
 */
export async function test_api_wishlist_item_removal_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer1 joins and authenticates
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1 = await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer1);
  // 2. Customer2 joins and authenticates
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2 = await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer2);
  // 3. Seller joins and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 4. Seller creates a product
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 5. Customer2 adds the product to their wishlist
  // Customer2's wishlist ID is the same as their customer ID
  const wishlistItem =
    await generate_random_ecommerce_customer_wishlists_items_create(
      customer2Connection,
      {
        body: {
          ecommerce_product_id: product.id,
        } satisfies IEcommerceWishlistItem.ICreate,
        params: {
          wishlistId: customer2.id,
        },
      },
    );
  typia.assert(wishlistItem);
  // 6. Customer1 attempts to remove Customer2's wishlist item (unauthorized)
  // Expected: 403 Forbidden because Customer1 does not own the wishlist
  await TestValidator.httpError(
    "customer1 cannot remove customer2's wishlist item",
    403,
    async () => {
      await api.functional.ecommerce.customer.wishlists.items.erase(
        customer1Connection,
        {
          wishlistId: customer2.id,
          itemId: wishlistItem.id,
        },
      );
    },
  );
}
