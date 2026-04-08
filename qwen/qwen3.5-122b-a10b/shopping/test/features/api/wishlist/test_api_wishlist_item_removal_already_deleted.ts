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
 * Test customer wishlist item removal when item is already deleted.
 *
 * Validates the edge case where a customer attempts to remove a wishlist item that has already been removed from their wishlist. This ensures the system properly handles duplicate deletion attempts and returns appropriate error responses.
 *
 * The test verifies that:
 * - First deletion of a wishlist item succeeds
 * - Second deletion attempt on the same item fails with 404 Not Found
 * - The system correctly identifies soft-deleted items and prevents duplicate removal operations
 *
 * 1. Customer registers and authenticates to obtain wishlist ID
 * 2. Seller registers and authenticates for product creation
 * 3. Seller creates a product (with automatic category handling)
 * 4. Customer adds the product to their wishlist
 * 5. Customer removes the wishlist item successfully (first deletion)
 * 6. Customer attempts to remove the same item again (should throw 404)
 */
export async function test_api_wishlist_item_removal_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Seller creates a product (prepare function handles category creation)
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Customer adds product to wishlist
  const wishlistItem =
    await generate_random_ecommerce_customer_wishlists_items_create(
      customerConnection,
      {
        body: {
          ecommerce_product_id: product.id,
        } satisfies IEcommerceWishlistItem.ICreate,
        params: {
          wishlistId: customerAuth.id,
        },
      },
    );
  typia.assert(wishlistItem);
  // 5. Customer successfully removes the wishlist item (first deletion)
  await api.functional.ecommerce.customer.wishlists.items.erase(
    customerConnection,
    {
      wishlistId: customerAuth.id,
      itemId: wishlistItem.id,
    },
  );
  // 6. Customer attempts to remove the same item again (should fail with 404)
  await TestValidator.httpError(
    "already deleted wishlist item",
    404,
    async () => {
      await api.functional.ecommerce.customer.wishlists.items.erase(
        customerConnection,
        {
          wishlistId: customerAuth.id,
          itemId: wishlistItem.id,
        },
      );
    },
  );
}