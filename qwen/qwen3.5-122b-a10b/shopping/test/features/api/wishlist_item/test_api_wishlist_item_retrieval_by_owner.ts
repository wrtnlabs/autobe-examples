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
 * Test customer retrieval of a specific wishlist item by owner.
 *
 * Validates the complete workflow for a customer to retrieve a product they saved to their wishlist. The test ensures proper authentication, product creation, wishlist item creation, and successful retrieval with all embedded product information.
 *
 * The test verifies that:
 * 1. Customer authentication works correctly
 * 2. Seller can create products for customers to wishlist
 * 3. Customer can add products to their wishlist
 * 4. Customer can retrieve their wishlist items with complete product details
 * 5. Product and wishlist item are not soft-deleted
 * 6. Customer owns the wishlist being accessed
 *
 * 1. Customer registers and authenticates via join operation.
 * 2. Seller registers and authenticates via join operation.
 * 3. Seller creates a product with name, description, category, and base price.
 * 4. Customer adds the product to their wishlist via the create endpoint.
 * 5. Customer retrieves the wishlist item using the get endpoint with wishlistId and itemId.
 * 6. Validates the response contains complete wishlist item with embedded product information.
 * 7. Validates product deleted_at is NULL (not soft-deleted).
 * 8. Validates wishlist item deleted_at is NULL (not soft-deleted).
 * 9. Validates customer owns the wishlist by checking the ecommerceWishlist.customer reference.
 */
export async function test_api_wishlist_item_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
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
  // 2. Seller authentication
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
  // 3. Seller creates a product
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
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
  // 5. Customer retrieves the wishlist item
  const retrievedItem =
    await api.functional.ecommerce.customer.wishlists.items.at(
      customerConnection,
      {
        wishlistId: customerAuth.id,
        itemId: wishlistItem.id,
      },
    );
  typia.assert(retrievedItem);
  // 6-9. Validate response
  TestValidator.equals(
    "wishlist item ID matches",
    retrievedItem.id,
    wishlistItem.id,
  );
  TestValidator.equals(
    "product ID matches",
    retrievedItem.ecommerceProduct.id,
    product.id,
  );
  TestValidator.equals(
    "product name matches",
    retrievedItem.ecommerceProduct.name,
    product.name,
  );
  TestValidator.predicate(
    "product not soft-deleted",
    retrievedItem.ecommerceProduct.deleted_at === null,
  );
  TestValidator.predicate(
    "wishlist item not soft-deleted",
    retrievedItem.deleted_at === null,
  );
  TestValidator.predicate(
    "wishlist belongs to customer",
    retrievedItem.ecommerceWishlist.customer.id === customerAuth.id,
  );
}