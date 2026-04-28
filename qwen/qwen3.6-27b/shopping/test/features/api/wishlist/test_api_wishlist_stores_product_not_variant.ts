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
import { generate_random_ecommerce_platform_customer_wishlist_create } from "../../../generate/generate_random_ecommerce_platform_customer_wishlist_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";
import { prepare_random_ecommerce_platform_wishlist_item } from "../../../prepare/prepare_random_ecommerce_platform_wishlist_item";

/**
 * Test that wishlist entries store product-level references rather than variant-specific configurations.
 *
 * This test validates the business rule that customers save products to their wishlist at the product level,
 * not at the variant level. When a product has multiple variants (e.g., different colors or sizes),
 * the wishlist entry should reference the product as a whole with its summary information
 * (name, base price, category, seller profile), not any specific variant configuration.
 *
 * 1. Administrator creates a category for product organization.
 * 2. Seller creates a product with a base price and assigns it to the category.
 * 3. Seller creates multiple variants with distinct SKU codes and option configurations (color, size).
 * 4. Customer adds the product to their wishlist using only the product ID.
 * 5. Validates that the wishlist item contains the product summary without variant-specific data.
 * 6. Confirms the product reference includes name, base price, category summary, and seller profile summary.
 */
export async function test_api_wishlist_stores_product_not_variant(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller joins to create products
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // Create a product with base price in the category
  const productBody = prepare_random_ecommerce_platform_product({
    category_id: category.id,
  });
  const product = await api.functional.ecommercePlatform.seller.products.create(
    sellerConnection,
    {
      body: productBody,
    },
  );
  typia.assert(product);
  // 3. Create multiple variants with different options (color and size)
  const variantOptions1: IEcommercePlatformProductVariantOption.ICreate[] = [
    { attributeKey: "color", attributeValue: "Red" },
    { attributeKey: "size", attributeValue: "Large" },
  ];
  await api.functional.ecommercePlatform.seller.products.variants.create(
    sellerConnection,
    {
      body: {
        options: variantOptions1,
        skuCode: RandomGenerator.alphaNumeric(12),
      } satisfies IEcommercePlatformProductVariant.ICreate,
      productId: product.id,
    },
  );
  const variantOptions2: IEcommercePlatformProductVariantOption.ICreate[] = [
    { attributeKey: "color", attributeValue: "Blue" },
    { attributeKey: "size", attributeValue: "Small" },
  ];
  await api.functional.ecommercePlatform.seller.products.variants.create(
    sellerConnection,
    {
      body: {
        options: variantOptions2,
        skuCode: RandomGenerator.alphaNumeric(12),
      } satisfies IEcommercePlatformProductVariant.ICreate,
      productId: product.id,
    },
  );
  // 4. Customer joins and adds product to wishlist
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Add the product to the wishlist (not a specific variant)
  const wishlistInput: IEcommercePlatformWishlistItem.ICreate = {
    product_id: product.id,
  };
  const wishlistItem =
    await api.functional.ecommercePlatform.customer.wishlist.create(
      customerConnection,
      {
        body: wishlistInput,
      },
    );
  typia.assert(wishlistItem);
  // 5. Validate wishlist item contains product-level reference, not variant-specific data
  TestValidator.equals(
    "wishlist product name matches",
    wishlistItem.product.name,
    product.name,
  );
  TestValidator.equals(
    "wishlist product base price matches",
    wishlistItem.product.basePrice,
    product.base_price,
  );
  // Verify the product reference includes category summary
  TestValidator.equals(
    "wishlist product category ID matches",
    wishlistItem.product.category.id,
    category.id,
  );
  TestValidator.equals(
    "wishlist product category name matches",
    wishlistItem.product.category.name,
    category.name,
  );
  // Verify the product reference includes seller profile summary
  TestValidator.predicate(
    "wishlist product has seller profile",
    wishlistItem.product.sellerProfile !== null,
  );
  // Verify product summary properties exist
  TestValidator.equals(
    "wishlist product id matches product",
    wishlistItem.product.id,
    product.id,
  );
  TestValidator.predicate(
    "wishlist product has description",
    wishlistItem.product.description !== undefined,
  );
  TestValidator.predicate(
    "wishlist product has created timestamp",
    wishlistItem.product.createdAt !== undefined,
  );
}
