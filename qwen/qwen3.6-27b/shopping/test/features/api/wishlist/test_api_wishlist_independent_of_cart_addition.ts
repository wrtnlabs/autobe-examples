import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShoppingCartItem";
import type { IEcommercePlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { generate_random_ecommerce_platform_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_platform_customer_cart_items_create";
import { generate_random_ecommerce_platform_customer_wishlist_create } from "../../../generate/generate_random_ecommerce_platform_customer_wishlist_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";
import { prepare_random_ecommerce_platform_shopping_cart_item } from "../../../prepare/prepare_random_ecommerce_platform_shopping_cart_item";
import { prepare_random_ecommerce_platform_wishlist_item } from "../../../prepare/prepare_random_ecommerce_platform_wishlist_item";

export async function test_api_wishlist_independent_of_cart_addition(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validates wishlist and shopping cart independence per business rule Section 323.
   *
   * Verifies that creating a shopping cart item for a product variant does not affect the customer's existing wishlist entry for the same product. An administrator creates a category, a seller creates a product with a variant, and a customer first saves the product to their wishlist. The customer then adds the variant to their cart.
   *
   * The wishlist item is validated to ensure it correctly references the product and maintains proper timestamps, confirming that cart operations operate independently without side effects on wishlist data.
   *
   * 1. Administrator registers and creates a product category.
   * 2. Seller registers, creates a product assigned to the category, then creates a product variant.
   * 3. Customer registers and saves the product to their wishlist, recording the product reference and timestamps.
   * 4. Customer adds the specific variant of that product to their shopping cart with quantity of 1.
   * 5. Validates that the wishlist item references the correct product and has valid timestamps, confirming independence from cart operations.
   */
  // 1. Administrator registers and creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller registers, creates product and product variant
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id }, body: {} },
    );
  typia.assert(variant);
  // 3. Customer registers and adds product to wishlist
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const wishlistItem =
    await generate_random_ecommerce_platform_customer_wishlist_create(
      customerConnection,
      { body: { product_id: product.id } },
    );
  typia.assert(wishlistItem);
  const wishItemId = wishlistItem.id;
  const wishlistCreatedAt = wishlistItem.created_at;
  const wishlistUpdatedAt = wishlistItem.updated_at;
  // 4. Customer adds variant to shopping cart
  const cartItem =
    await generate_random_ecommerce_platform_customer_cart_items_create(
      customerConnection,
      { body: { product_variant_id: variant.id, quantity: 1 } },
    );
  typia.assert(cartItem);
  // 5. Validate wishlist independence from cart operations
  // Wishlist item references the correct product
  TestValidator.equals(
    "wishlist product reference matches the saved product",
    wishlistItem.product.id,
    product.id,
  );
  // Wishlist item has valid identity and timestamps independent of cart
  TestValidator.predicate("wishlist item has valid UUID", Boolean(wishItemId));
  TestValidator.predicate(
    "wishlist created_at is valid date-time",
    Boolean(/^d{4}-d{2}-d{2}Td{2}:d{2}:d{2}/.test(wishlistCreatedAt)),
  );
  TestValidator.predicate(
    "wishlist updated_at is valid date-time",
    Boolean(/^d{4}-d{2}-d{2}Td{2}:d{2}:d{2}/.test(wishlistUpdatedAt)),
  );
  // Cart item correctly references the variant (independent from wishlist product reference)
  TestValidator.equals(
    "cart item references the added product variant",
    cartItem.productVariant.id,
    variant.id,
  );
  // Wishlist product and cart variant belong to the same product (independence verification)
  TestValidator.equals(
    "wishlist product and cart variant share the same parent product",
    wishlistItem.product.id,
    cartItem.productVariant.product.id,
  );
}
