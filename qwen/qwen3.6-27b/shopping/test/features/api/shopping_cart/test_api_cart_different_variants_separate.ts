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
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";
import { prepare_random_ecommerce_platform_shopping_cart_item } from "../../../prepare/prepare_random_ecommerce_platform_shopping_cart_item";

/**
 * Test that adding different product variants for the same product creates separate cart items maintaining independent quantities.
 *
 * Validates the complete e-commerce cart workflow including administrative category setup, seller product and variant creation, and customer cart operations. Ensures that when a customer adds multiple variants of the same product, each variant gets its own distinct cart item with the correct quantity preserved independently.
 *
 * Special attention is given to verifying that the cart upsert key [customer_id, product_variant_id] correctly distinguishes between different variants, so adding Variant B with quantity 3 does not merge into or overwrite Variant A's cart item with quantity 2.
 *
 * 1. Administrator creates a category for product classification.
 * 2. Seller joins and creates a product within that category.
 * 3. Seller creates two distinct variants (Variant A: SKU-001 color=Red/size=Large, Variant B: SKU-002 color=Blue/size=Small).
 * 4. Customer joins and adds Variant A to cart with quantity 2.
 * 5. Customer adds Variant B to cart with quantity 3.
 * 6. Validates that both cart items have different IDs and maintain independent quantities (2 and 3 respectively).
 * 7. Confirms each cart item references the correct product variant.
 */
export async function test_api_cart_different_variants_separate(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(category);
  // 2. Seller setup - create product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          category_id: category.id,
        },
      },
    );
  typia.assert(product);
  // 3. Create Variant A (SKU-001, Red/Large)
  const variantA =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: "SKU-001",
          options: [
            { attributeKey: "color", attributeValue: "Red" },
            { attributeKey: "size", attributeValue: "Large" },
          ],
        },
      },
    );
  typia.assert(variantA);
  // 4. Create Variant B (SKU-002, Blue/Small)
  const variantB =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: "SKU-002",
          options: [
            { attributeKey: "color", attributeValue: "Blue" },
            { attributeKey: "size", attributeValue: "Small" },
          ],
        },
      },
    );
  typia.assert(variantB);
  // 5. Customer setup - add items to cart
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 6. Add Variant A to cart with quantity 2
  const cartItemA =
    await generate_random_ecommerce_platform_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variantA.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItemA);
  // 7. Add Variant B to cart with quantity 3
  const cartItemB =
    await generate_random_ecommerce_platform_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variantB.id,
          quantity: 3,
        },
      },
    );
  typia.assert(cartItemB);
  // 8. Validate separation of different variants
  // Verify both cart items have distinct IDs
  TestValidator.notEquals(
    "cart items have different IDs",
    cartItemA.id,
    cartItemB.id,
  );
  // Verify Variant A's cart item has quantity 2
  TestValidator.equals(
    "Variant A cart item quantity is 2",
    cartItemA.quantity,
    2,
  );
  // Verify Variant B's cart item has quantity 3
  TestValidator.equals(
    "Variant B cart item quantity is 3",
    cartItemB.quantity,
    3,
  );
  // Verify Variant A's cart item references the correct variant
  TestValidator.equals(
    "Variant A cart references correct variant",
    cartItemA.productVariant.id,
    variantA.id,
  );
  // Verify Variant B's cart item references the correct variant
  TestValidator.equals(
    "Variant B cart references correct variant",
    cartItemB.productVariant.id,
    variantB.id,
  );
  // Verify variants are distinct
  TestValidator.notEquals(
    "variants have different IDs",
    variantA.id,
    variantB.id,
  );
  // Verify both variants belong to the same product
  TestValidator.equals(
    "both variants belong to same product",
    variantA.product.id,
    variantB.product.id,
  );
}
