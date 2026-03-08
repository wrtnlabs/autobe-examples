import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test the stock warning edge case when customer updates cart item quantity exceeding available stock.
 *
 * This test validates that:
 * 1. Customers can update cart item quantities even when exceeding available stock
 * 2. The system sets stock_warning = true when quantity exceeds stock
 * 3. The unavailable flag remains false for low-stock items (not deleted)
 * 4. Business rule: stock warnings are advisory and non-blocking for cart updates
 */
export async function test_api_cart_item_quantity_exceeds_stock_warning(
  connection: api.IConnection,
): Promise<void> {
  // ============================================
  // Step 1: Administrator Setup - Create Category
  // ============================================
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // ============================================
  // Step 2: Seller Setup - Create Product and Variant
  // ============================================
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Minimum<1000> & tags.Maximum<100000>
        >(),
      },
    },
  );
  typia.assert(product);
  // Create variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // ============================================
  // Step 3: Add Limited Inventory (5 units)
  // ============================================
  const limitedStockQuantity = 5;
  const inventoryRecord =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_change: limitedStockQuantity,
          reason: "Initial stock for testing stock warning",
        },
      },
    );
  typia.assert(inventoryRecord);
  // ============================================
  // Step 4: Customer Setup - Add to Cart
  // ============================================
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Add variant to cart with quantity within stock limit (2 units)
  const initialQuantity = 2;
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: initialQuantity,
        },
      },
    );
  typia.assert(cartItem);
  // Verify initial state - no stock warning
  TestValidator.equals("initial quantity", cartItem.quantity, initialQuantity);
  TestValidator.equals("initial stock_warning", cartItem.stock_warning, false);
  TestValidator.equals("initial unavailable", cartItem.unavailable, false);
  // ============================================
  // Step 5: Update Quantity Exceeding Stock
  // ============================================
  const excessiveQuantity = 10; // Exceeds stock of 5
  const updatedCartItem =
    await api.functional.shoppingMall.customer.cart.items.putByCartitemid(
      customerConnection,
      {
        cartItemId: cartItem.id,
        body: { quantity: excessiveQuantity },
      },
    );
  typia.assert(updatedCartItem);
  // ============================================
  // Step 6: Validate Stock Warning Behavior
  // ============================================
  // Quantity should be updated despite exceeding stock
  TestValidator.equals(
    "updated quantity",
    updatedCartItem.quantity,
    excessiveQuantity,
  );
  // stock_warning flag should be set to true
  TestValidator.equals(
    "stock_warning flag",
    updatedCartItem.stock_warning,
    true,
  );
  // unavailable should remain false (variant is still active, just low stock)
  TestValidator.equals("unavailable flag", updatedCartItem.unavailable, false);
  // Price and subtotal should be correctly calculated
  TestValidator.predicate("price is positive", updatedCartItem.price > 0);
  TestValidator.equals(
    "subtotal calculation",
    updatedCartItem.subtotal,
    updatedCartItem.price * excessiveQuantity,
  );
  // Variant reference should still be valid
  TestValidator.equals(
    "variant id matches",
    updatedCartItem.variant.id,
    variant.id,
  );
  // timestamps should be updated
  TestValidator.predicate(
    "updated_at is recent",
    new Date(updatedCartItem.updated_at).getTime() > Date.now() - 60000,
  );
}
