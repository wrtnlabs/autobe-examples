import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * This E2E test verifies the administrator's ability to permanently delete a
 * customer order by its unique ID, ensuring the entire prerequisite setup for
 * creating an order in the shopping mall platform is performed.
 *
 * The test performs the following steps in order:
 *
 * 1. Admin user registration and authentication
 * 2. Seller user registration and authentication
 * 3. Customer user registration and authentication
 * 4. Creating a product category
 * 5. Creating a seller entity
 * 6. Creating a customer entity
 * 7. Creating a product linked to the created category and seller
 * 8. Creating a new customer order referencing the created customer and seller
 * 9. Deleting the created order permanently through the admin user's deletion
 *    endpoint.
 *
 * At each step, the test asserts successful creation and correct typing of all
 * entities and validates that the deletion endpoint executes without error,
 * confirming irreversible order removal.
 */
export async function test_api_admin_order_permanent_deletion(
  connection: api.IConnection,
) {
  // 1. Admin user joins to obtain admin authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Seller user joins to obtain seller authentication
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(12),
    company_name: RandomGenerator.name(),
    contact_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 3. Customer user joins to obtain customer authentication
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 4. Admin creates product category
  const categoryCreateBody = {
    parent_id: null,
    code: `CAT-${RandomGenerator.alphaNumeric(5).toUpperCase()}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 5. Admin creates seller entity (for order linkage) using seller info
  const sellerCreateBody = {
    email: seller.email,
    password_hash: RandomGenerator.alphaNumeric(12),
    company_name: seller.company_name,
    contact_name: seller.contact_name,
    phone_number: seller.phone_number,
    status: "active",
  } satisfies IShoppingMallSeller.ICreate;
  const adminCreatedSeller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: sellerCreateBody,
    });
  typia.assert(adminCreatedSeller);

  // 6. Admin creates customer entity (for order linkage) using customer info
  const customerCreateBody = {
    email: customer.email,
    password_hash: RandomGenerator.alphaNumeric(12),
    nickname: customer.nickname ?? null,
    phone_number: customer.phone_number ?? null,
    status: "active",
  } satisfies IShoppingMallCustomer.ICreate;
  const adminCreatedCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customers.create(connection, {
      body: customerCreateBody,
    });
  typia.assert(adminCreatedCustomer);

  // 7. Admin creates product linked to category and seller
  const productCreateBody = {
    shopping_mall_category_id: category.id,
    shopping_mall_seller_id: adminCreatedSeller.id,
    code: `PRD-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "Draft",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 8. Customer creates a new order referencing customer and seller
  const orderNumber = `ORD-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const orderCreateBody = {
    shopping_mall_customer_id: adminCreatedCustomer.id,
    shopping_mall_seller_id: adminCreatedSeller.id,
    order_number: orderNumber,
    total_price: 9999.99,
    status: "Pending Payment",
    business_status: "new",
    payment_method: "credit_card",
    shipping_address: "123 Main Street, Seoul, South Korea",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 9. Admin permanently deletes the order by ID
  await api.functional.shoppingMall.admin.orders.erase(connection, {
    orderId: order.id,
  });
  // Successful test if no errors thrown
}
