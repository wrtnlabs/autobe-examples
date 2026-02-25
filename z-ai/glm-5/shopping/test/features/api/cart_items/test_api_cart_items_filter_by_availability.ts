import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_history } from "../../../prepare/prepare_random_shopping_mall_product_inventory_history";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

export async function test_api_cart_items_filter_by_availability(
  connection: api.IConnection,
): Promise<void> {
  // Phase 1: Setup admin and approve seller
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Phase 2: Create seller and get approved
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller.id,
  });
  // Phase 3: Create product with variants having different stock levels
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Minimum<1000> & tags.Maximum<100000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  // Variant A: Sufficient stock (100 units)
  const variantSufficient =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-SUFF-${RandomGenerator.alphaNumeric(6)}`,
          optionValues: [
            { key: "color", value: "Blue" },
            { key: "size", value: "M" },
          ],
          stockQuantity: 0,
        },
      },
    );
  typia.assert(variantSufficient);
  await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
    sellerConnection,
    {
      params: { variantId: variantSufficient.id },
      body: {
        quantity: 100,
        reason: "Initial stock for availability test",
      },
    },
  );
  // Variant B: Low stock (2 units)
  const variantLowStock =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-LOW-${RandomGenerator.alphaNumeric(6)}`,
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "S" },
          ],
          stockQuantity: 2,
        },
      },
    );
  typia.assert(variantLowStock);
  // Variant C: Zero stock (0 units)
  const variantZeroStock =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-ZERO-${RandomGenerator.alphaNumeric(6)}`,
          optionValues: [
            { key: "color", value: "Green" },
            { key: "size", value: "L" },
          ],
          stockQuantity: 0,
        },
      },
    );
  typia.assert(variantZeroStock);
  // Phase 4: Customer setup and add items to cart
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Cart item with sufficient stock (quantity 5, stock 100)
  const cartItemAvailable =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variantSufficient.id,
          quantity: 5,
        },
      },
    );
  typia.assert(cartItemAvailable);
  // Cart item with insufficient stock (quantity 10, stock 2)
  const cartItemInsufficient =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variantLowStock.id,
          quantity: 10,
        },
      },
    );
  typia.assert(cartItemInsufficient);
  // Cart item with zero stock (quantity 1, stock 0)
  const cartItemUnavailable =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variantZeroStock.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItemUnavailable);
  // Phase 5: Test filtering by availability_status
  // Test 1: Filter by "available" - should return only items with sufficient stock
  const availableResult =
    await api.functional.shoppingMall.customer.cart_items.index(
      customerConnection,
      {
        body: {
          availability_status: "available",
        },
      },
    );
  typia.assert(availableResult);
  TestValidator.predicate(
    "available filter returns only available items",
    availableResult.data.every(
      (item) => item.availability_status === "available",
    ),
  );
  TestValidator.predicate(
    "available filter includes sufficient stock item",
    availableResult.data.some((item) => item.id === cartItemAvailable.id),
  );
  // Test 2: Filter by "unavailable" - should return items with insufficient/zero stock
  const unavailableResult =
    await api.functional.shoppingMall.customer.cart_items.index(
      customerConnection,
      {
        body: {
          availability_status: "unavailable",
        },
      },
    );
  typia.assert(unavailableResult);
  TestValidator.predicate(
    "unavailable filter returns only non-available items",
    unavailableResult.data.every(
      (item) =>
        item.availability_status === "unavailable" ||
        item.availability_status === "insufficient_stock",
    ),
  );
  TestValidator.equals(
    "unavailable filter returns 2 items",
    unavailableResult.data.length,
    2,
  );
  // Test 3: Filter by "all" - should return all items
  const allResult = await api.functional.shoppingMall.customer.cart_items.index(
    customerConnection,
    {
      body: {
        availability_status: "all",
      },
    },
  );
  typia.assert(allResult);
  TestValidator.equals("all filter returns 3 items", allResult.data.length, 3);
  // Phase 6: Validate cart item summary structure and computed fields
  for (const item of allResult.data) {
    // Validate subtotal calculation
    TestValidator.equals(
      "subtotal equals unit_price * quantity",
      item.subtotal,
      item.unit_price * item.quantity,
    );
    // Validate current_stock is non-negative
    TestValidator.predicate(
      "current_stock is non-negative",
      item.current_stock >= 0,
    );
    // Validate variant summary has required fields
    TestValidator.predicate(
      "variant has sku_code",
      typeof item.variant.sku_code === "string",
    );
    TestValidator.predicate(
      "variant has options array",
      Array.isArray(item.variant.options),
    );
    // Validate product summary has required fields
    TestValidator.predicate(
      "product has name",
      typeof item.product.name === "string",
    );
    TestValidator.predicate(
      "product has base_price",
      typeof item.product.base_price === "number",
    );
    // Validate seller summary has required fields
    TestValidator.predicate(
      "seller has shopName",
      typeof item.seller.shopName === "string",
    );
    // Validate seller consistency if product has seller
    if (item.product.seller !== undefined) {
      TestValidator.equals(
        "seller matches product seller",
        item.seller.id,
        item.product.seller.id,
      );
    }
  }
  // Phase 7: Validate availability_status computation
  const availableItem = allResult.data.find(
    (item) => item.id === cartItemAvailable.id,
  );
  const insufficientItem = allResult.data.find(
    (item) => item.id === cartItemInsufficient.id,
  );
  const unavailableItem = allResult.data.find(
    (item) => item.id === cartItemUnavailable.id,
  );
  if (availableItem !== undefined) {
    TestValidator.equals(
      "sufficient stock item has availability_status available",
      availableItem.availability_status,
      "available",
    );
  }
  if (insufficientItem !== undefined) {
    TestValidator.equals(
      "low stock item has availability_status insufficient_stock",
      insufficientItem.availability_status,
      "insufficient_stock",
    );
  }
  if (unavailableItem !== undefined) {
    TestValidator.equals(
      "zero stock item has availability_status unavailable",
      unavailableItem.availability_status,
      "unavailable",
    );
  }
  // Phase 8: Test pagination with non-empty results
  const page1Result =
    await api.functional.shoppingMall.customer.cart_items.index(
      customerConnection,
      {
        body: {
          availability_status: "all",
          limit: 2,
          page: 1,
        },
      },
    );
  typia.assert(page1Result);
  TestValidator.predicate(
    "pagination returns at most limit items",
    page1Result.data.length <= 2,
  );
  TestValidator.equals(
    "pagination current page is 1",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 2",
    page1Result.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination total records is 3",
    page1Result.pagination.records,
    3,
  );
}
