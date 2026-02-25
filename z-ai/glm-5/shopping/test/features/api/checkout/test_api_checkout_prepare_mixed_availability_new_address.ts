import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckoutPrepare } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckoutPrepare";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_history } from "../../../prepare/prepare_random_shopping_mall_product_inventory_history";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

export async function test_api_checkout_prepare_mixed_availability_new_address(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // Create a category for products
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: { name: RandomGenerator.name() } },
  );
  typia.assert(category);
  // Create first seller (will be approved)
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {});
  typia.assert(seller1Auth);
  // Approve seller 1
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller1Auth.id,
  });
  // Re-login seller 1 after approval
  const seller1ApprovedConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(seller1ApprovedConnection, {
    body: {
      email: seller1Auth.email,
      password: seller1Auth.token.refresh,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create product for seller 1
  const product1 = await generate_random_shopping_mall_seller_products_create(
    seller1ApprovedConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 10000,
        category_id: category.id,
      },
    },
  );
  typia.assert(product1);
  // Create variant 1 with stock
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      seller1ApprovedConnection,
      {
        params: { productId: product1.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: [{ key: "color", value: "Red" }],
          stockQuantity: 10,
        },
      },
    );
  typia.assert(variant1);
  // Create variant 2 with limited stock (for insufficient stock test)
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      seller1ApprovedConnection,
      {
        params: { productId: product1.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: [{ key: "color", value: "Blue" }],
          stockQuantity: 2,
        },
      },
    );
  typia.assert(variant2);
  // Create variant 3 with zero stock
  const variant3 =
    await generate_random_shopping_mall_seller_products_variants_create(
      seller1ApprovedConnection,
      {
        params: { productId: product1.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: [{ key: "color", value: "Green" }],
          stockQuantity: 0,
        },
      },
    );
  typia.assert(variant3);
  // Create customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // Add variant 1 to cart (valid, in stock)
  const cartItem1 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant1.id,
          quantity: 3,
        },
      },
    );
  typia.assert(cartItem1);
  // Add variant 2 to cart with quantity more than stock (insufficient stock)
  const cartItem2 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant2.id,
          quantity: 5,
        },
      },
    );
  typia.assert(cartItem2);
  // Add variant 3 to cart (out of stock)
  const cartItem3 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant3.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem3);
  // Call checkout prepare with new address
  const checkoutPrepare =
    await api.functional.shoppingMall.customer.customers.me.checkout.prepare(
      customerConnection,
      {
        body: {
          addressId: null,
          recipientName: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street: "123 Test Street",
          city: "Test City",
          state: "Test State",
          postalCode: "12345",
          country: "Test Country",
        } satisfies IShoppingMallCheckoutPrepare.IRequest,
      },
    );
  typia.assert(checkoutPrepare);
  // Validate the response
  TestValidator.predicate("checkout should be valid", checkoutPrepare.valid);
  TestValidator.predicate(
    "items array should have items",
    checkoutPrepare.items.length >= 3,
  );
  TestValidator.predicate(
    "warnings should exist",
    checkoutPrepare.warnings.length > 0,
  );
  TestValidator.predicate(
    "subtotal should be positive",
    checkoutPrepare.subtotal > 0,
  );
  // Find items by their variant sku codes
  const item1 = checkoutPrepare.items.find(
    (item) => item.variant_sku_code === variant1.skuCode,
  );
  const item2 = checkoutPrepare.items.find(
    (item) => item.variant_sku_code === variant2.skuCode,
  );
  const item3 = checkoutPrepare.items.find(
    (item) => item.variant_sku_code === variant3.skuCode,
  );
  // Validate item 1 - should be in stock and available
  TestValidator.predicate(
    "variant1 should exist in items",
    item1 !== undefined,
  );
  if (item1) {
    TestValidator.predicate("variant1 should be in stock", item1.in_stock);
    TestValidator.predicate(
      "variant1 should not be unavailable",
      !item1.unavailable,
    );
    TestValidator.equals("variant1 quantity", item1.quantity, 3);
    TestValidator.equals("variant1 stock", item1.stock, 10);
  }
  // Validate item 2 - should have insufficient stock
  TestValidator.predicate(
    "variant2 should exist in items",
    item2 !== undefined,
  );
  if (item2) {
    TestValidator.predicate("variant2 should not be in stock", !item2.in_stock);
    TestValidator.predicate(
      "variant2 should not be unavailable",
      !item2.unavailable,
    );
    TestValidator.equals("variant2 quantity", item2.quantity, 5);
    TestValidator.equals("variant2 stock", item2.stock, 2);
  }
  // Validate item 3 - should be out of stock
  TestValidator.predicate(
    "variant3 should exist in items",
    item3 !== undefined,
  );
  if (item3) {
    TestValidator.predicate("variant3 should not be in stock", !item3.in_stock);
    TestValidator.predicate(
      "variant3 should not be unavailable",
      !item3.unavailable,
    );
    TestValidator.equals("variant3 quantity", item3.quantity, 1);
    TestValidator.equals("variant3 stock", item3.stock, 0);
  }
  // Validate warnings contain appropriate messages
  const hasInsufficientStockWarning = checkoutPrepare.warnings.some((w) =>
    w.includes("insufficient stock"),
  );
  const hasOutOfStockWarning = checkoutPrepare.warnings.some((w) =>
    w.includes("out of stock"),
  );
  TestValidator.predicate(
    "should have insufficient stock warning",
    hasInsufficientStockWarning,
  );
  TestValidator.predicate(
    "should have out of stock warning",
    hasOutOfStockWarning,
  );
}
