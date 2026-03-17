import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test that historical snapshots in order items preserve product and variant state exactly as they were at order time,
 * even after the original product or variant is modified.
 *
 * Test Flow:
 * 1. Seller joins and logs in
 * 2. Seller creates product with initial state
 * 3. Seller creates variant with initial configuration
 * 4. Customer joins and logs in
 * 5. Customer adds item to cart and places order (creates snapshots)
 * 6. Seller modifies product (name, description, base_price)
 * 7. Seller modifies variant (sku_code, options, price)
 * 8. Seller retrieves order item and verifies snapshots contain ORIGINAL state
 * 9. Verify current product/variant show UPDATED state
 */
export async function test_api_seller_order_item_snapshot_integrity(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================================
  // 1. SELLER SETUP - Create seller account and authenticate
  // ============================================================================
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(sellerJoin);
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoin.email,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLogin);
  // ============================================================================
  // 2. CREATE PRODUCT - With initial state (will be modified later)
  // ============================================================================
  const initialProductName = RandomGenerator.paragraph({ sentences: 1 });
  const initialProductDescription = RandomGenerator.paragraph({ sentences: 3 });
  const initialBasePrice = 50000;
  // Need to create a category first for product creation
  // Since we don't have category creation in available functions, we'll use a random UUID
  // In real test, category would be pre-created by admin
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: initialProductName,
        description: initialProductDescription,
        shopping_category_id: categoryId,
        base_price: initialBasePrice,
      },
    },
  );
  typia.assert(product);
  // Store original product state for comparison
  const originalProductState = {
    id: product.id,
    name: product.name,
    description: product.description,
    base_price: product.base_price,
  };
  // ============================================================================
  // 3. CREATE VARIANT - With initial configuration (will be modified later)
  // ============================================================================
  const initialSkuCode = `SKU-ORIGINAL-${RandomGenerator.alphaNumeric(8)}`;
  const initialVariantPrice = 55000;
  const initialStockQuantity = 100;
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: initialSkuCode,
          price: initialVariantPrice,
          stock_quantity: initialStockQuantity,
          options: [
            {
              key: "color",
              value: "Red",
            },
            {
              key: "size",
              value: "Large",
            },
          ],
        },
      },
    );
  typia.assert(variant);
  // Store original variant state for comparison
  const originalVariantState = {
    id: variant.id,
    sku_code: variant.skuCode,
    price: variant.price,
    stock_quantity: variant.stockQuantity,
    options: variant.options.map((opt) => ({ key: opt.key, value: opt.value })),
  };
  // ============================================================================
  // 4. CUSTOMER SETUP - Create customer account and authenticate
  // ============================================================================
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "CustomerPass123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerJoin);
  const customerLogin = await authorize_customer_login(customerConnection, {
    body: {
      email: customerJoin.email,
      password: "CustomerPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(customerLogin);
  // ============================================================================
  // 5. PLACE ORDER - This creates product and variant snapshots
  // ============================================================================
  // First add item to cart
  const cartItem =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItem);
  // Place order (this creates snapshots)
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(order);
  // Get the order item from the order
  TestValidator.predicate("order has items", () => order.items.length > 0);
  const orderItem = order.items[0];
  TestValidator.equals(
    "order item variant matches",
    orderItem.productVariant.id,
    variant.id,
  );
  // Store snapshot data at order time
  const snapshotAtOrderTime = {
    productSnapshot: {
      name: orderItem.productSnapshot.name,
      base_price: orderItem.productSnapshot.base_price,
    },
    variantSnapshot: {
      sku_code: orderItem.productVariantSnapshot.sku_code,
      price: orderItem.productVariantSnapshot.price,
      stock_quantity: orderItem.productVariantSnapshot.stock_quantity,
      option_values: orderItem.productVariantSnapshot.option_values,
    },
  };
  // ============================================================================
  // 6. SELLER MODIFIES PRODUCT - After order is placed
  // ============================================================================
  const updatedProductName = RandomGenerator.paragraph({ sentences: 1 });
  const updatedProductDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedBasePrice = 75000;
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: updatedProductName,
        description: updatedProductDescription,
        basePrice: updatedBasePrice,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // Verify product was actually updated
  TestValidator.notEquals(
    "product name changed",
    originalProductState.name,
    updatedProduct.name,
  );
  TestValidator.notEquals(
    "product base_price changed",
    originalProductState.base_price,
    updatedProduct.base_price,
  );
  // ============================================================================
  // 7. SELLER MODIFIES VARIANT - After order is placed
  // ============================================================================
  const updatedSkuCode = `SKU-UPDATED-${RandomGenerator.alphaNumeric(8)}`;
  const updatedVariantPrice = 80000;
  const updatedStockQuantity = 50;
  const updatedVariant =
    await api.functional.shoppingMall.seller.sellers.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          skuCode: updatedSkuCode,
          price: updatedVariantPrice,
          stockQuantity: updatedStockQuantity,
          optionValues: {
            color: "Blue",
            size: "Medium",
          },
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // Verify variant was actually updated
  TestValidator.notEquals(
    "variant sku_code changed",
    originalVariantState.sku_code,
    updatedVariant.skuCode,
  );
  TestValidator.notEquals(
    "variant price changed",
    originalVariantState.price,
    updatedVariant.price,
  );
  // ============================================================================
  // 8. RETRIEVE ORDER ITEM - Verify snapshots preserve ORIGINAL state
  // ============================================================================
  const retrievedOrderItem =
    await api.functional.shoppingMall.seller.orders.items.at(sellerConnection, {
      orderId: order.id,
      itemId: orderItem.id,
    });
  typia.assert(retrievedOrderItem);
  // ============================================================================
  // 9. VERIFY SNAPSHOTS CONTAIN ORIGINAL STATE (NOT UPDATED STATE)
  // ============================================================================
  // Product snapshot should contain ORIGINAL name, not updated name
  TestValidator.equals(
    "product snapshot preserves original name",
    retrievedOrderItem.productSnapshot.name,
    originalProductState.name,
  );
  TestValidator.equals(
    "product snapshot preserves original base_price",
    retrievedOrderItem.productSnapshot.base_price,
    originalProductState.base_price,
  );
  TestValidator.notEquals(
    "product snapshot does NOT contain updated name",
    retrievedOrderItem.productSnapshot.name,
    updatedProductName,
  );
  // Variant snapshot should contain ORIGINAL configuration, not updated configuration
  TestValidator.equals(
    "variant snapshot preserves original sku_code",
    retrievedOrderItem.productVariantSnapshot.sku_code,
    originalVariantState.sku_code,
  );
  TestValidator.equals(
    "variant snapshot preserves original price",
    retrievedOrderItem.productVariantSnapshot.price,
    originalVariantState.price,
  );
  TestValidator.equals(
    "variant snapshot preserves original stock_quantity",
    retrievedOrderItem.productVariantSnapshot.stock_quantity,
    originalVariantState.stock_quantity,
  );
  // Verify option values are preserved (original: color=Red, size=Large)
  TestValidator.equals(
    "variant snapshot preserves original color option",
    retrievedOrderItem.productVariantSnapshot.option_values["color"],
    "Red",
  );
  TestValidator.equals(
    "variant snapshot preserves original size option",
    retrievedOrderItem.productVariantSnapshot.option_values["size"],
    "Large",
  );
  // Verify snapshots do NOT contain updated values
  TestValidator.notEquals(
    "variant snapshot does NOT contain updated sku_code",
    retrievedOrderItem.productVariantSnapshot.sku_code,
    updatedSkuCode,
  );
  TestValidator.notEquals(
    "variant snapshot does NOT contain updated price",
    retrievedOrderItem.productVariantSnapshot.price,
    updatedVariantPrice,
  );
  TestValidator.notEquals(
    "variant snapshot does NOT contain updated color",
    retrievedOrderItem.productVariantSnapshot.option_values["color"],
    "Blue",
  );
  // ============================================================================
  // 10. VERIFY CURRENT ENTITIES SHOW UPDATED STATE
  // ============================================================================
  // Current product should show updated values
  TestValidator.equals(
    "current product shows updated name",
    updatedProduct.name,
    updatedProductName,
  );
  TestValidator.equals(
    "current product shows updated base_price",
    updatedProduct.base_price,
    updatedBasePrice,
  );
  // Current variant should show updated values
  TestValidator.equals(
    "current variant shows updated sku_code",
    updatedVariant.skuCode,
    updatedSkuCode,
  );
  TestValidator.equals(
    "current variant shows updated price",
    updatedVariant.price,
    updatedVariantPrice,
  );
  TestValidator.equals(
    "current variant shows updated color option",
    updatedVariant.options.find((opt) => opt.key === "color")?.value,
    "Blue",
  );
  TestValidator.equals(
    "current variant shows updated size option",
    updatedVariant.options.find((opt) => opt.key === "size")?.value,
    "Medium",
  );
  // ============================================================================
  // SUMMARY: Snapshots preserve historical accuracy
  // ============================================================================
  // This test validates that:
  // - productSnapshot contains state at order time (before modifications)
  // - productVariantSnapshot contains configuration at order time (before modifications)
  // - Current product and variant entities reflect latest changes
  // - Order records remain accurate for dispute resolution even when products change
}
