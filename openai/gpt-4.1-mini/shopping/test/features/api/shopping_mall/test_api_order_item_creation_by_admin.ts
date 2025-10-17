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

/**
 * Tests the complete workflow for admin adding an order item to an existing
 * order.
 *
 * This test includes:
 *
 * 1. Admin user creation and authentication.
 * 2. Customer creation for order association.
 * 3. Seller creation for product listing.
 * 4. Product category creation.
 * 5. Product creation linked to seller and category.
 * 6. Order creation by the customer.
 * 7. Role switching authentication to admin.
 * 8. Admin adds an order item to the existing order using the created product's
 *    SKU.
 * 9. Validations on responses and strict adherence to DTO types.
 */
export async function test_api_order_item_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Create and authenticate admin user by join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  const adminCreateBody = {
    email: adminEmail,
    password_hash: adminPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active" as const,
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.create(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  await api.functional.auth.admin.join(connection, { body: adminCreateBody });

  // 2. Create a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerCreateBody = {
    email: customerEmail,
    password_hash: "CustomerPass123!",
    nickname: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customers.create(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // 3. Create a seller
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: "SellerPass123!",
    company_name: RandomGenerator.name(),
    contact_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active" as const,
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  // 4. Create a product category
  const categoryCreateBody = {
    parent_id: null,
    code: RandomGenerator.alphaNumeric(6).toUpperCase(),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    display_order: typia.random<number & tags.Type<"int32">>() % 100,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  // 5. Create a product linked to seller and category
  const productCreateBody = {
    shopping_mall_category_id: category.id,
    shopping_mall_seller_id: seller.id,
    code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 4,
      wordMax: 10,
    }),
    status: "active",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 6. Create an order for the customer
  const orderCreateBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_seller_id: seller.id,
    order_number: `ORD-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    total_price: 100,
    status: "pending",
    business_status: "new",
    payment_method: "credit_card",
    shipping_address: `${RandomGenerator.paragraph({ sentences: 1 })}, Seoul, South Korea`,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 7. Switch authentication context by login as admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminCreateBody.email,
      password: adminPassword,
      type: "admin",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 8. Admin adds an order item to the existing order using product SKU
  const orderItemCreateBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_sku_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: 1,
    unit_price: 100,
    total_price: 100,
  } satisfies IShoppingMallOrderItem.ICreate;

  const createdOrderItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.admin.orders.items.create(connection, {
      orderId: order.id,
      body: orderItemCreateBody,
    });
  typia.assert(createdOrderItem);

  TestValidator.equals(
    "added order item order ID",
    createdOrderItem.shopping_mall_order_id,
    order.id,
  );

  TestValidator.equals(
    "added order item quantity",
    createdOrderItem.quantity,
    1,
  );

  TestValidator.equals(
    "added order item unit price",
    createdOrderItem.unit_price,
    100,
  );

  TestValidator.equals(
    "added order item total price",
    createdOrderItem.total_price,
    100,
  );
}
