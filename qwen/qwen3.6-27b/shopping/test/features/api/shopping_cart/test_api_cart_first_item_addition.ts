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
 * Test adding a product variant to a customer's shopping cart for the first time.
 *
 * Validates the complete cart item creation flow including administrative category setup, seller product and variant creation, and customer cart addition. Ensures the cart item is created with the requested quantity and contains proper references to the product variant and customer.
 *
 * The test verifies that creation timestamps are set, the cart item is not soft-deleted, the variant SKU code is correctly referenced, and the customer identity is properly linked to the cart item.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers and creates a product assigned to the category.
 * 3. Seller creates a product variant with option attributes (color, size).
 * 4. Customer registers and authenticates.
 * 5. Customer adds the product variant to their cart with quantity 2.
 * 6. Validates cart item details match input and variant data.
 */
export async function test_api_cart_first_item_addition(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      { body: { name: RandomGenerator.alphabets(8) } },
    );
  typia.assert(category);
  // 2. Seller setup - register and create product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product = await api.functional.ecommercePlatform.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<number & tags.Minimum<0>>(),
        category_id: category.id,
      } satisfies IEcommercePlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Seller creates variant with option attributes
  const skuCode = "SKU-" + RandomGenerator.alphabets(8).toUpperCase();
  const variant =
    await api.functional.ecommercePlatform.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode,
          options: [
            { attributeKey: "color", attributeValue: "Red" },
            { attributeKey: "size", attributeValue: "Large" },
          ] satisfies IEcommercePlatformProductVariantOption.ICreate[],
        } satisfies IEcommercePlatformProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Customer setup - register and get authorized identity
  const customerConnection: api.IConnection = { host: connection.host };
  const authCustomer = await authorize_customer_join(customerConnection, {});
  typia.assert(authCustomer);
  // 5. Customer adds variant to cart with quantity 2
  const cartItem =
    await api.functional.ecommercePlatform.customer.cart_items.create(
      customerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: 2,
        } satisfies IEcommercePlatformShoppingCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 6. Validate cart item details
  TestValidator.equals("quantity matches request", cartItem.quantity, 2);
  TestValidator.equals(
    "variant ID matches",
    cartItem.productVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "variant SKU code matches",
    cartItem.productVariant.sku_code,
    skuCode,
  );
  TestValidator.equals(
    "customer ID linked correctly",
    cartItem.customer.id,
    authCustomer.id,
  );
  TestValidator.predicate(
    "created_at is populated",
    cartItem.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is populated",
    cartItem.updated_at !== undefined,
  );
  TestValidator.equals("not soft-deleted", cartItem.deleted_at, null);
}
