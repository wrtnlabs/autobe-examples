import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that cart items are correctly marked as unavailable when product variants are deleted or out of stock.
 *
 * Validates the cart listing behavior when product variants become unavailable due to deletion or stock depletion. Ensures that cart items persist until explicitly removed by the customer, with accurate availability flags reflecting variant status.
 *
 * The test verifies that:
 * 1. Cart items referencing deleted variants are marked as unavailable (available: false)
 * 2. Cart items referencing out-of-stock variants are marked as unavailable (available: false)
 * 3. Cart items referencing available variants remain marked as available (available: true)
 * 4. Product information is still accessible for unavailable items for customer reference
 * 5. Subtotal calculation works correctly for both available and unavailable items
 *
 * 1. Register and authenticate as customer and seller.
 * 2. Seller creates a product with three variants: one with stock, one without stock, and one to be deleted.
 * 3. Customer adds all three variants to cart.
 * 4. Seller deletes one variant.
 * 5. Customer lists cart items and validates availability flags.
 */
export async function test_api_cart_list_mixed_availability(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 2. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        base_price: typia.random<number & tags.Type<"uint32">>(),
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates three variants
  // Variant 1: With stock (available)
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "VAR-AVAILABLE-001",
          variantOptions: [{ key: "color", value: "Red" }],
          initialStockQuantity: 10,
        },
      },
    );
  typia.assert(variant1);
  // Variant 2: Without stock (unavailable)
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "VAR-OUTOFSTOCK-002",
          variantOptions: [{ key: "color", value: "Blue" }],
          initialStockQuantity: 0,
        },
      },
    );
  typia.assert(variant2);
  // Variant 3: With stock (will be deleted)
  const variant3 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "VAR-TOBEDELETED-003",
          variantOptions: [{ key: "color", value: "Green" }],
          initialStockQuantity: 5,
        },
      },
    );
  typia.assert(variant3);
  // 5. Customer adds all three variants to cart
  const cartItem1 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant1.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant2.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem2);
  const cartItem3 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant3.id,
          quantity: 3,
        },
      },
    );
  typia.assert(cartItem3);
  // 6. Seller deletes variant3
  await api.functional.shoppingMall.seller.products.variants.erase(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant3.id,
    },
  );
  // 7. Customer lists cart items
  const cartItems = await api.functional.shoppingMall.customer.carts.index(
    customerConnection,
    {
      body: {},
    },
  );
  typia.assert(cartItems);
  // 8. Validate cart items
  TestValidator.equals("cart item count", cartItems.data.length, 3);
  // Find each cart item by variant SKU
  const availableItem = cartItems.data.find(
    (item) => item.productVariant.sku_code === "VAR-AVAILABLE-001",
  );
  const outOfStockItem = cartItems.data.find(
    (item) => item.productVariant.sku_code === "VAR-OUTOFSTOCK-002",
  );
  const deletedItem = cartItems.data.find(
    (item) => item.productVariant.sku_code === "VAR-TOBEDELETED-003",
  );
  // Validate available item
  const safeAvailableItem = typia.assert(availableItem!);
  TestValidator.predicate(
    "available variant is marked available",
    safeAvailableItem.available,
  );
  TestValidator.equals(
    "available item quantity",
    safeAvailableItem.quantity,
    2,
  );
  TestValidator.predicate(
    "available item has valid subtotal",
    safeAvailableItem.subtotal > 0,
  );
  TestValidator.predicate(
    "available item has product info",
    safeAvailableItem.product.name.length > 0,
  );
  // Validate out-of-stock item
  const safeOutOfStockItem = typia.assert(outOfStockItem!);
  TestValidator.predicate(
    "out-of-stock variant is marked unavailable",
    !safeOutOfStockItem.available,
  );
  TestValidator.equals(
    "out-of-stock item quantity",
    safeOutOfStockItem.quantity,
    1,
  );
  TestValidator.predicate(
    "out-of-stock item has valid subtotal",
    safeOutOfStockItem.subtotal > 0,
  );
  TestValidator.predicate(
    "out-of-stock item has product info",
    safeOutOfStockItem.product.name.length > 0,
  );
  // Validate deleted item
  const safeDeletedItem = typia.assert(deletedItem!);
  TestValidator.predicate(
    "deleted variant is marked unavailable",
    !safeDeletedItem.available,
  );
  TestValidator.equals(
    "deleted item quantity",
    safeDeletedItem.quantity,
    3,
  );
  TestValidator.predicate(
    "deleted item has valid subtotal",
    safeDeletedItem.subtotal > 0,
  );
  TestValidator.predicate(
    "deleted item has product info",
    safeDeletedItem.product.name.length > 0,
  );
}