import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that a newly registered customer can add a new item (product SKU) to an
 * existing shopping mall order using the POST endpoint. The test covers both
 * success and error scenarios. Steps:
 *
 * 1. Register a new customer and authenticate.
 * 2. Assume a valid orderNumber and generate random product/SKU IDs.
 * 3. Add an item to the order and verify the response matches the input and links
 *    properly.
 * 4. Intentionally add an item with invalid SKU ID (should error).
 * 5. Intentionally add quantity exceeding inventory (should error).
 * 6. Attempt to add the same SKU again to the same order (should error on
 *    duplicate).
 */
export async function test_api_customer_order_item_creation(
  connection: api.IConnection,
) {
  // 1. Register and authenticate new customer
  const customerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: customerBody,
  });
  typia.assert(customerAuth);

  // 2. Assume valid orderNumber (placeholder for demo) and create random product/SKU IDs
  // In integrated suites, this would be a real order with real product/SKU refs set up earlier.
  const orderNumber = RandomGenerator.alphaNumeric(10);
  const validProductId = typia.random<string & tags.Format<"uuid">>();
  const validSkuId = typia.random<string & tags.Format<"uuid">>();
  const unitPrice = 19900; // test price
  const quantity = 2;
  const body = {
    shopping_mall_product_id: validProductId,
    shopping_mall_product_sku_id: validSkuId,
    quantity,
    unit_price: unitPrice,
    subtotal: unitPrice * quantity,
    currency: "KRW",
    delivered: false,
    refunded: false,
  } satisfies IShoppingMallOrderItem.ICreate;

  // 3. Add item to existing order
  const item = await api.functional.shoppingMall.customer.orders.items.create(
    connection,
    { orderNumber, body },
  );
  typia.assert(item);
  TestValidator.equals(
    "item product id",
    item.product.id,
    body.shopping_mall_product_id,
  );
  TestValidator.equals(
    "item sku id",
    item.sku.id,
    body.shopping_mall_product_sku_id,
  );
  TestValidator.equals("item quantity", item.quantity, body.quantity);
  TestValidator.equals("item subtotal", item.subtotal, body.subtotal);
  TestValidator.equals("item currency", item.currency, body.currency);
  TestValidator.equals("item delivered", item.delivered, body.delivered);
  TestValidator.equals("item refunded", item.refunded, body.refunded);
  TestValidator.equals(
    "item linked to correct order number",
    item.order.order_number,
    orderNumber,
  );

  // 4. Business rule error: Add item with invalid product/SKU id
  const invalidSkuId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("adding invalid SKU id should error", async () => {
    await api.functional.shoppingMall.customer.orders.items.create(connection, {
      orderNumber,
      body: {
        ...body,
        shopping_mall_product_sku_id: invalidSkuId,
      },
    });
  });

  // 5. Business rule error: Add item with quantity exceeding plausible inventory
  await TestValidator.error(
    "adding item with excessive quantity should error",
    async () => {
      await api.functional.shoppingMall.customer.orders.items.create(
        connection,
        {
          orderNumber,
          body: {
            ...body,
            quantity: 999999,
            subtotal: body.unit_price * 999999,
          },
        },
      );
    },
  );

  // 6. Business rule error: Add duplicate SKU to same order
  await TestValidator.error(
    "adding duplicate SKU to order should error",
    async () => {
      await api.functional.shoppingMall.customer.orders.items.create(
        connection,
        {
          orderNumber,
          body,
        },
      );
    },
  );
}
