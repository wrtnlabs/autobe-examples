import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate admin can create and add a valid order item (SKU) to an existing
 * order via admin endpoint.
 *
 * 1. Register a new admin and authenticate.
 * 2. Create a business order number (simulate an existing order context as needed
 *    by using random string).
 * 3. Generate valid order item creation input (valid random product and SKU UUIDs,
 *    random price/quantity/currency/subtotal, with delivered/refunded false).
 * 4. Use order item creation API as authenticated admin
 *    (api.functional.shoppingMall.admin.orders.items.create).
 * 5. Ensure the response is a valid IShoppingMallOrderItem, check the linkage to
 *    the order and correctness of fields (unit_price, subtotal, product/sku
 *    summary match, etc).
 * 6. Validate proper typing and all business required fields.
 */
export async function test_api_order_item_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10) + "1@A";
  const adminName = RandomGenerator.name();
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword as string &
          tags.MinLength<8> &
          tags.Format<"password">,
        name: adminName as string & tags.MinLength<1>,
      },
    });
  typia.assert(adminAuth);

  // 2. Create a random business order number (simulate existing order context)
  // For this test, use a random string as order number; production systems would require a real order
  const orderNumber = RandomGenerator.alphaNumeric(10).toUpperCase();

  // 3. Generate valid order item creation input
  // Simulate IDs and details for the order item. In a real test, you'd fetch full product/SKU/order, but here we randomize.
  const productId = typia.random<string & tags.Format<"uuid">>();
  const productSkuId = typia.random<string & tags.Format<"uuid">>();
  const quantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const unitPrice = Math.floor(Math.random() * 100000) + 10;
  const subtotal = unitPrice * quantity;
  const currency = RandomGenerator.pick(["KRW", "USD", "EUR"] as const);
  const body = {
    shopping_mall_product_id: productId,
    shopping_mall_product_sku_id: productSkuId,
    quantity,
    unit_price: unitPrice,
    subtotal,
    currency,
    delivered: false,
    refunded: false,
  } satisfies IShoppingMallOrderItem.ICreate;

  // 4. Use order item creation API as authenticated admin
  const orderItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.admin.orders.items.create(connection, {
      orderNumber,
      body,
    });
  typia.assert(orderItem);

  // 5. Check the linkage to the order and correctness of key fields
  TestValidator.equals(
    "order linkage order number",
    orderItem.order.order_number,
    orderNumber,
  );
  TestValidator.predicate(
    "subtotal is quantity × unit_price",
    orderItem.subtotal === quantity * unitPrice,
  );
  TestValidator.equals("currency matches", orderItem.currency, currency);
  TestValidator.equals("quantity matches", orderItem.quantity, quantity);
  TestValidator.equals("delivered flag is false", orderItem.delivered, false);
  TestValidator.equals("refunded flag is false", orderItem.refunded, false);
  TestValidator.equals("product id matches", orderItem.product.id, productId);
  TestValidator.equals("sku id matches", orderItem.sku.id, productSkuId);
}
