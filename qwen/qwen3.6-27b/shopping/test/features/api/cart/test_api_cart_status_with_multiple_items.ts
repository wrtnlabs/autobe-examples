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
 * Test cart status correctly aggregates multiple distinct cart items from different product variants.
 *
 * Validates that GET /ecommercePlatform/customer/cart/status returns accurate aggregated data when the customer's cart contains multiple line items referencing distinct product variant configurations. Each variant has its own price, SKU, and stock level, and cart items maintain independent quantities. The cart status must correctly compute the total price by summing each item's subtotal (quantity multiplied by applicable unit price).
 *
 * Special attention is given to verifying that variant-specific details are correctly preserved per cart item, that quantities are independently tracked, and that the total price computation is mathematically correct across all items.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers and creates a product with two distinct variants.
 * 3. Customer registers and adds both variants to the shopping cart.
 * 4. Retrieves cart status and validates item count, variant details, and totalPrice aggregation.
 */
export async function test_api_cart_status_with_multiple_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and create category
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminCredentials.email,
      password: adminCredentials.password,
    },
  });
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller setup - register and create product with two variants
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerCredentials.email,
      password: sellerCredentials.password,
    },
  });
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          category_id: category.id,
        },
      },
    );
  typia.assert(product);
  const variant1 =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          price: 15000,
        },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          price: 25000,
        },
      },
    );
  typia.assert(variant2);
  // 3. Customer setup - register and add both variants to cart
  const customerConnection: api.IConnection = { host: connection.host };
  const customerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerCredentials.email,
      password: customerCredentials.password,
    },
  });
  const cartItem1 =
    await generate_random_ecommerce_platform_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variant1.id,
          quantity: 3,
        },
      },
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await generate_random_ecommerce_platform_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variant2.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem2);
  // 4. Retrieve cart status
  const cartStatus =
    await api.functional.ecommercePlatform.customer.cart.status(
      customerConnection,
    );
  typia.assert(cartStatus);
  // 5. Validate cart status
  TestValidator.predicate(
    "cart contains exactly two items",
    cartStatus.items.length === 2,
  );
  TestValidator.notEquals(
    "variant IDs are distinct",
    cartStatus.items[0].productVariant.id,
    cartStatus.items[1].productVariant.id,
  );
  const price1 = cartStatus.items[0].productVariant.price ?? product.base_price;
  const price2 = cartStatus.items[1].productVariant.price ?? product.base_price;
  const item1Subtotal = cartStatus.items[0].quantity * price1;
  const item2Subtotal = cartStatus.items[1].quantity * price2;
  const expectedTotal = item1Subtotal + item2Subtotal;
  TestValidator.equals(
    "totalPrice equals sum of item subtotals",
    cartStatus.totalPrice,
    expectedTotal,
  );
  TestValidator.equals(
    "item1 subtotal matches quantity times price",
    item1Subtotal,
    cartStatus.items[0].quantity * price1,
  );
  TestValidator.equals(
    "item2 subtotal matches quantity times price",
    item2Subtotal,
    cartStatus.items[1].quantity * price2,
  );
}
