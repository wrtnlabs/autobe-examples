import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_cart_item_quantity_zero_removes_item(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@example.com",
      password: "admin1234",
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000/",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller setup - register, create product with variant
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Create product with variant
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
        description: "Test product for cart quantity zero removal",
        name: "Test Product - Quantity Zero Test",
        basePrice: 10000,
      },
    },
  );
  typia.assert(product);
  // Create first variant
  const variant1 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          optionValues: [{ key: "size", value: "large" }],
          price: 15000,
          quantity: 100,
          skuCode: `SKU-QZ1-${Date.now()}`,
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant1);
  // Create second variant for testing unaffected items
  const variant2 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          optionValues: [{ key: "size", value: "small" }],
          price: 12000,
          quantity: 50,
          skuCode: `SKU-QZ2-${Date.now()}`,
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant2);
  // 3. Customer setup - join and add items to cart
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Add first item to cart
  const cart1 =
    await generate_random_ecommerce_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant1.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cart1);
  // Get the first cart item ID
  const firstCartItemId = cart1.items[0].id;
  // Add second item to cart
  const cart2 =
    await generate_random_ecommerce_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant2.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cart2);
  // Verify we have 2 items in cart
  TestValidator.equals(
    "cart should have 2 items before removal",
    cart2.items.length,
    2,
  );
  // 4. Update first cart item quantity to 0 - should trigger removal
  await api.functional.ecommerceMall.customer.cart.items.update(
    customerConnection,
    {
      itemId: firstCartItemId,
      body: {
        quantity: 0,
      } satisfies IEcommerceMallCartItem.IUpdate,
    },
  );
  // 5. Verify first item is no longer in cart, second item remains
  // Query cart to check remaining items
  const cartAfterRemoval =
    await generate_random_ecommerce_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant1.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartAfterRemoval);
  // Should have only 1 item now (variant2)
  TestValidator.equals(
    "cart should have 1 item after removing first item",
    cartAfterRemoval.items.length,
    1,
  );
  // Verify the remaining item is variant2 (not variant1)
  const remainingItem = cartAfterRemoval.items[0];
  TestValidator.equals(
    "remaining item should be variant2",
    remainingItem.variantSkuCode,
    variant2.skuCode,
  );
  // 6. Test removing the last item - cart should still exist but be empty of items
  const lastItemId = cartAfterRemoval.items[0].id;
  await api.functional.ecommerceMall.customer.cart.items.update(
    customerConnection,
    {
      itemId: lastItemId,
      body: {
        quantity: 0,
      } satisfies IEcommerceMallCartItem.IUpdate,
    },
  );
  // 7. Verify empty cart state - add an item and check cart is clean
  const emptyCartCheck =
    await generate_random_ecommerce_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant1.id,
          quantity: 1,
        },
      },
    );
  typia.assert(emptyCartCheck);
  // After clearing all items and adding one new, cart should have 1 item
  TestValidator.equals(
    "cart should have 1 item after clearing and adding new",
    emptyCartCheck.items.length,
    1,
  );
  // Verify the new item is variant1
  const newItem = emptyCartCheck.items[0];
  TestValidator.equals(
    "new item should be variant1",
    newItem.variantSkuCode,
    variant1.skuCode,
  );
}
