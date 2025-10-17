import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Full business flow test for updating an order as a seller.
 *
 * This test does the following:
 *
 * 1. Register and authenticate a seller (with complete details and company info).
 * 2. Register and authenticate a customer.
 * 3. Register and authenticate an admin user for creating seller entities.
 * 4. Create seller entity using admin account.
 * 5. Create customer entity using the public API.
 * 6. Customer creates an order with realistic order details.
 * 7. Seller authenticates again to perform order update.
 * 8. Seller updates the order with valid new information (status, business_status,
 *    payment_method, tracking_number).
 * 9. Validate the updated order details are correct and follow all constraints.
 *
 * This test ensures proper role-based multi-authentication flow and business
 * rules enforcement throughout creation and update of orders.
 *
 * It uses typia.assert for strict type validation and TestValidator for
 * business assertions to guarantee integrity and correctness of the workflow.
 */
export async function test_api_seller_order_update(
  connection: api.IConnection,
) {
  // 1. Register and authenticate seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "safePassword123";
  const newSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password_hash: sellerPassword,
        company_name: RandomGenerator.name(3),
        contact_name: RandomGenerator.name(2),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(newSeller);

  // 2. Register and authenticate customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "safePassword123";
  const newCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(newCustomer);

  // 3. Register and authenticate admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "safePassword123";
  const newAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        full_name: RandomGenerator.name(3),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(newAdmin);

  // 4. Create seller entity using admin
  const sellerEntity: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: {
        email: sellerEmail,
        password_hash: sellerPassword,
        company_name: RandomGenerator.name(3),
        contact_name: RandomGenerator.name(2),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(sellerEntity);

  // 5. Create customer entity
  const customerEntity: IShoppingMallCustomer =
    await api.functional.shoppingMall.customers.create(connection, {
      body: {
        email: customerEmail,
        password_hash: customerPassword,
        nickname: RandomGenerator.name(2),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customerEntity);

  // 6. Customer creates order
  const newOrder: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shopping_mall_customer_id: customerEntity.id,
        shopping_mall_seller_id: sellerEntity.id,
        order_number: RandomGenerator.alphaNumeric(12),
        total_price: Math.round(10000 + Math.random() * 50000),
        status: "pending",
        business_status: "processing",
        payment_method: "credit_card",
        shipping_address: "123 Main St, Anytown, Country",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(newOrder);

  // 7. Seller authenticates again to update order
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      } satisfies IShoppingMallSeller.ILogin,
    });
  typia.assert(sellerLoggedIn);

  // 8. Seller updates the order
  const updatedOrder: IShoppingMallOrder =
    await api.functional.shoppingMall.seller.orders.update(connection, {
      orderId: newOrder.id,
      body: {
        status: "paid",
        business_status: "completed",
        payment_method: "paypal",
        tracking_number: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallOrder.IUpdate,
    });
  typia.assert(updatedOrder);

  // 9. Validate the updated order
  TestValidator.equals(
    "Updated order id matches the original",
    updatedOrder.id,
    newOrder.id,
  );
  TestValidator.equals(
    "Updated order status is paid",
    updatedOrder.status,
    "paid",
  );
  TestValidator.equals(
    "Updated order business status is completed",
    updatedOrder.business_status,
    "completed",
  );
  TestValidator.equals(
    "Updated payment method is paypal",
    updatedOrder.payment_method,
    "paypal",
  );
  TestValidator.predicate(
    "Tracking number is not empty",
    updatedOrder.tracking_number !== null &&
      updatedOrder.tracking_number !== undefined &&
      updatedOrder.tracking_number.length > 0,
  );
}
