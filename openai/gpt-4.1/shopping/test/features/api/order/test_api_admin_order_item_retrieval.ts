import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test admin retrieval of a specific shopping mall order item (with
 * authorization & access control).
 *
 * Scenario steps:
 *
 * 1. Register and authenticate a new admin. Save admin credentials for later.
 * 2. Register and authenticate a new customer. Save customer credentials for
 *    later.
 * 3. Customer creates a new order item with randomized product/SKU and
 *    price/quantity data and gets the created item's id and parent
 *    orderNumber.
 * 4. Switch to admin context (login again with admin credentials).
 * 5. Admin retrieves the specific order item by GET
 *    /shoppingMall/admin/orders/{orderNumber}/items/{orderItemId}.
 * 6. Verifies admin receives the correct item details matching what was created
 *    (check all major fields & sub-summaries).
 * 7. Negative test: Admin attempts to retrieve a non-existent order item (should
 *    receive error).
 * 8. Negative test: Admin attempts to retrieve an item under non-existent
 *    orderNumber (should receive error).
 *
 * Validates both item granularity and administrative access control, as well as
 * error logic.
 */
export async function test_api_admin_order_item_retrieval(
  connection: api.IConnection,
) {
  // Register admin and save credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminAuth);
  // Save admin credentials for re-authentication

  // Register customer and save credentials
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(10);
  const customerName = RandomGenerator.name();
  const customerPhone = RandomGenerator.mobile();
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      name: customerName,
      phone: customerPhone,
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customerAuth);
  // Save customer credentials

  // Authenticate as customer (in case system requires fresh login after join)
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://mall.example.com/login",
      referrer: "https://mall.example.com/landing",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Generate random order number for test order
  const orderNumber = "ORD" + RandomGenerator.alphaNumeric(8).toUpperCase();
  // Create orderItem as customer
  const productId = typia.random<string & tags.Format<"uuid">>();
  const skuId = typia.random<string & tags.Format<"uuid">>();
  const quantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const unitPrice = Math.floor(Math.random() * 10000 + 1000); // random price >= 1000
  const currency = RandomGenerator.pick(["KRW", "USD", "EUR"] as const);
  const body = {
    shopping_mall_product_id: productId,
    shopping_mall_product_sku_id: skuId,
    quantity,
    unit_price: unitPrice,
    subtotal: unitPrice * quantity,
    currency,
    delivered: false,
    refunded: false,
  } satisfies IShoppingMallOrderItem.ICreate;
  const orderItem =
    await api.functional.shoppingMall.customer.orders.items.create(connection, {
      orderNumber,
      body,
    });
  typia.assert(orderItem);
  TestValidator.equals(
    "orderNumber matches",
    orderItem.order.order_number,
    orderNumber,
  );

  // Switch to admin context: Login admin again
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Admin fetches the specific order item by orderNumber/itemId
  const adminView = await api.functional.shoppingMall.admin.orders.items.at(
    connection,
    {
      orderNumber,
      orderItemId: orderItem.id,
    },
  );
  typia.assert(adminView);

  // Validate the full structure and details returned
  TestValidator.equals("order item id matches", adminView.id, orderItem.id);
  TestValidator.equals(
    "order number matches",
    adminView.order.order_number,
    orderNumber,
  );
  TestValidator.equals(
    "order item product id matches",
    adminView.product.id,
    productId,
  );
  TestValidator.equals("order item sku id matches", adminView.sku.id, skuId);
  TestValidator.equals("quantity matches", adminView.quantity, quantity);
  TestValidator.equals("unit price matches", adminView.unit_price, unitPrice);
  TestValidator.equals(
    "subtotal matches",
    adminView.subtotal,
    unitPrice * quantity,
  );
  TestValidator.equals("currency matches", adminView.currency, currency);
  TestValidator.equals("delivered is false", adminView.delivered, false);
  TestValidator.equals("refunded is false", adminView.refunded, false);

  // Error scenario: non-existent orderItemId
  const randomUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "admin: retrieval by non-existent order item should error",
    async () => {
      await api.functional.shoppingMall.admin.orders.items.at(connection, {
        orderNumber,
        orderItemId: randomUuid,
      });
    },
  );
  // Error scenario: non-existent orderNumber
  const randomOrderNumber =
    "ORD" + RandomGenerator.alphaNumeric(10).toUpperCase();
  await TestValidator.error(
    "admin: retrieval by non-existent order number should error",
    async () => {
      await api.functional.shoppingMall.admin.orders.items.at(connection, {
        orderNumber: randomOrderNumber,
        orderItemId: orderItem.id,
      });
    },
  );
}
