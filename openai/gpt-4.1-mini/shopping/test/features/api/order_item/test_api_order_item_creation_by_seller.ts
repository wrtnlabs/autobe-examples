import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test the workflow of adding an order item to an existing order by a seller.
 *
 * This test covers the following steps:
 *
 * 1. Seller Authentication: Register a new seller account and obtain JWT tokens.
 * 2. Admin Authentication: Register a new admin account and obtain tokens to
 *    enable admin operations.
 * 3. Customer Registration to prepare order's customer.
 * 4. Create a product category needed for the product.
 * 5. Create a seller account referenced by the product.
 * 6. Create a product linked to the category and seller.
 * 7. Create a SKU variant for the product.
 * 8. Create a shopping mall customer for the order.
 * 9. Create an order associated with the customer and seller.
 * 10. Create an order item with valid SKU, quantity, unit price, and total price.
 * 11. Validate the creation of the order item with the correct details and linkage
 *     to order and SKU.
 */
export async function test_api_order_item_creation_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller Authentication: Register a new seller account and obtain JWT tokens.
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    status: "active" as const,
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  // 2. Admin Authentication: Register a new admin account
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    status: "active" as const,
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(admin);

  // 3. Customer Registration for the order
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    status: "active" as const,
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customers.create(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // 4. Create a product category
  const categoryCreateBody = {
    code: RandomGenerator.name(2).replace(/\s/g, "_").toLowerCase(),
    name: RandomGenerator.name(2),
    display_order: RandomGenerator.alphaNumeric(2).length, // arbitrary small number
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  // 5. Create a seller account for the product
  const sellerCreateAdminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    status: "active" as const,
  } satisfies IShoppingMallSeller.ICreate;
  const sellerAdmin: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: sellerCreateAdminBody,
    });
  typia.assert(sellerAdmin);

  // 6. Create a product linked to category and seller
  const productCreateBody = {
    shopping_mall_category_id: category.id,
    shopping_mall_seller_id: sellerAdmin.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(3),
    status: "active" as const,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 7. Create SKU variant for the product
  const skuCreateBody = {
    shopping_mall_product_id: product.id,
    sku_code: RandomGenerator.alphaNumeric(10).toUpperCase(),
    price: Math.round(Math.random() * 10000) / 100 || 10.0,
    status: "active" as const,
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 8. Create an order associated with the customer and seller
  const orderNumber = `ORDER-${RandomGenerator.alphaNumeric(6).toUpperCase()}`;
  const orderCreateBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_seller_id: sellerAdmin.id,
    order_number: orderNumber,
    total_price: 0.0,
    status: "pending",
    business_status: "pending",
    payment_method: "credit_card",
    shipping_address: "123 Demo Road, Seoul, South Korea",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 9. Create order item with valid SKU and pricing
  const quantity = 2;
  const unitPrice = sku.price;
  const totalPrice = quantity * unitPrice;
  const orderItemCreateBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_sku_id: sku.id,
    quantity: quantity,
    unit_price: unitPrice,
    total_price: totalPrice,
  } satisfies IShoppingMallOrderItem.ICreate;
  const orderItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.seller.orders.items.create(connection, {
      orderId: order.id,
      body: orderItemCreateBody,
    });
  typia.assert(orderItem);

  // Validation checks
  TestValidator.equals(
    "orderItem's order ID equals order.id",
    orderItem.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "orderItem's SKU ID equals sku.id",
    orderItem.shopping_mall_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "orderItem quantity matches input",
    orderItem.quantity,
    quantity,
  );
  TestValidator.equals(
    "orderItem unit price matches SKU price",
    orderItem.unit_price,
    unitPrice,
  );
  TestValidator.equals(
    "orderItem total price equals quantity * unit_price",
    orderItem.total_price,
    totalPrice,
  );
}
