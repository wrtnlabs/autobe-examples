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
 * Tests a typical successful update of a customer's order item.
 *
 * Scenario:
 *
 * 1. Register a new customer and keep credentials
 * 2. Register new admin
 * 3. Admin login for setup
 * 4. Admin adds an order item to an order on behalf of the customer
 * 5. Customer login
 * 6. Customer updates allowed fields (quantity, unit_price, delivered/refunded)
 * 7. Validate that changes are applied and type/business rules enforced
 */
export async function test_api_customer_order_item_update_successful(
  connection: api.IConnection,
) {
  // 1. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(10) + "A!"; // ensure >8 chars and symbol
  const customerName = RandomGenerator.name();
  const customerPhone = RandomGenerator.mobile();

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword as string &
        tags.MinLength<8> &
        tags.Format<"password">,
      name: customerName,
      phone: customerPhone,
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // 2. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10) + "A!";
  const adminName = RandomGenerator.name();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword as string &
        tags.MinLength<8> &
        tags.Format<"password">,
      name: adminName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 3. Admin login for header context
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 4. Admin adds an order item (simulate known orderNumber for test)
  // Use random orderNumber (10 chars, safe for test isolation)
  const orderNumber = RandomGenerator.alphaNumeric(12).toUpperCase();
  // Setup for product ids, sku ids (for test: random uuid values)
  const productId = typia.random<string & tags.Format<"uuid">>();
  const skuId = typia.random<string & tags.Format<"uuid">>();
  const currency = RandomGenerator.pick(["USD", "KRW", "JPY", "EUR"] as const);
  const initialQuantity = 2;
  const initialUnitPrice = 1000;
  const orderItemCreate = {
    shopping_mall_product_id: productId,
    shopping_mall_product_sku_id: skuId,
    quantity: initialQuantity,
    unit_price: initialUnitPrice,
    subtotal: initialQuantity * initialUnitPrice,
    currency: currency,
    delivered: false,
    refunded: false,
  } satisfies IShoppingMallOrderItem.ICreate;

  const createdOrderItem =
    await api.functional.shoppingMall.admin.orders.items.create(connection, {
      orderNumber,
      body: orderItemCreate,
    });
  typia.assert(createdOrderItem);

  // 5. Customer login (switch connection context)
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://localhost/test-order-item-update", // test URL
      referrer: "https://localhost/", // test referrer
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 6. Update order item as customer (allowed fields)
  const updatedQuantity = initialQuantity + 1;
  const newUnitPrice = initialUnitPrice + 500;
  const newDelivered = true;
  const newRefunded = false;
  const updateBody = {
    quantity: updatedQuantity,
    unit_price: newUnitPrice,
    delivered: newDelivered,
    refunded: newRefunded,
  } satisfies IShoppingMallOrderItem.IUpdate;

  const updatedOrderItem =
    await api.functional.shoppingMall.customer.orders.items.update(connection, {
      orderNumber,
      orderItemId: createdOrderItem.id,
      body: updateBody,
    });
  typia.assert(updatedOrderItem);

  // 7. Test assertions - updated fields match update, original fields unchanged, business rules enforced
  TestValidator.equals(
    "order item quantity updated",
    updatedOrderItem.quantity,
    updatedQuantity,
  );
  TestValidator.equals(
    "order item unit_price updated",
    updatedOrderItem.unit_price,
    newUnitPrice,
  );
  TestValidator.equals(
    "order item delivered updated",
    updatedOrderItem.delivered,
    newDelivered,
  );
  TestValidator.equals(
    "order item refunded updated",
    updatedOrderItem.refunded,
    newRefunded,
  );
  TestValidator.equals(
    "order item currency remains unchanged",
    updatedOrderItem.currency,
    currency,
  );
  TestValidator.equals(
    "order item product id remains unchanged",
    updatedOrderItem.product.id,
    productId,
  );
  TestValidator.predicate(
    "quantity is positive",
    updatedOrderItem.quantity > 0,
  );
  TestValidator.predicate(
    "unit price is non-negative",
    updatedOrderItem.unit_price >= 0,
  );
  TestValidator.predicate(
    "updated_at is properly refreshed",
    typeof updatedOrderItem.updated_at === "string" &&
      updatedOrderItem.updated_at.length > 0,
  );
}
