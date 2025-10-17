import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatus";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate deletion of specific order status records by admin user.
 *
 * This test fully exercises the ability of an admin to delete order status
 * records. It includes:
 *
 * - Admin user creation and login.
 * - Customer and seller creation for order linkage.
 * - Order creation.
 * - Multiple status records creation for the order.
 * - Deleting one status record by the admin.
 * - Validation of status deletion effect and error handling for invalid
 *   deletions.
 *
 * Each step ensures proper authorization, linkage, and operational correctness.
 */
export async function test_api_order_status_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin Join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "password123";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin Login (role switching)
  const loggedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        type: "admin",
      } satisfies IShoppingMallAdmin.ILogin,
    });
  typia.assert(loggedAdmin);

  // 3. Create customer
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword = "password123";
  const customerJoin: IShoppingMallCustomer.IJoin = {
    email: customerEmail,
    password: customerPassword,
  };
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: customerJoin });
  typia.assert(customerAuthorized);

  // 4. Login customer (for completeness, though may not be used for deletion)
  const customerLoginPayload: IShoppingMallCustomer.ILogin = {
    email: customerEmail,
    password: customerPassword,
    __typename: "",
  };
  // The __typename is required by ILogin but no description about value,
  // setting empty string as common practice
  const loggedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginPayload,
    });
  typia.assert(loggedCustomer);

  // 5. Create seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "password123";
  const sellerCreateBody = {
    email: sellerEmail,
    password_hash: sellerPassword,
    status: "active",
  } satisfies IShoppingMallSeller.ICreate;
  const seller = await api.functional.shoppingMall.admin.sellers.create(
    connection,
    {
      body: sellerCreateBody,
    },
  );
  typia.assert(seller);

  // 6. Create order linked with customer and seller
  const orderBody = {
    shopping_mall_customer_id: customerAuthorized.id,
    shopping_mall_seller_id: seller.id,
    order_number: `ORD-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
    total_price: 12345.67,
    status: "pending",
    business_status: "created",
    payment_method: "credit_card",
    shipping_address: "123 Main St, City, Country",
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: orderBody,
    },
  );
  typia.assert(order);

  // 7. Create multiple order statuses
  const statusesToCreate = ["pending", "paid", "shipped"] as const;

  const createdStatuses: IShoppingMallOrderStatus[] = [];
  for (const status of statusesToCreate) {
    const statusCreateBody = {
      shopping_mall_order_id: order.id,
      status: status,
      status_changed_at: new Date().toISOString(),
    } satisfies IShoppingMallOrderStatus.ICreate;
    const createdStatus =
      await api.functional.shoppingMall.admin.orders.statuses.create(
        connection,
        {
          orderId: order.id,
          body: statusCreateBody,
        },
      );
    typia.assert(createdStatus);
    createdStatuses.push(createdStatus);
  }

  TestValidator.equals(
    "initial statuses count",
    createdStatuses.length,
    statusesToCreate.length,
  );

  // 8. Delete one order status by admin
  /*
    Steps:
    - Use the admin authentication context (already connected with admin)
    - Delete the first created status ID
    - Validate no content response - API returns void
    - Validate that attempting to fetch or get that status fails - not possible
    - Since no direct get for status exists, we test delete success here only
  */

  await api.functional.shoppingMall.admin.orders.statuses.erase(connection, {
    orderId: order.id,
    statusId: createdStatuses[0].id,
  });

  // 9. Try to Delete a non-existent status and assert error
  const fakeStatusId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "delete with non-existent status ID fails",
    async () => {
      await api.functional.shoppingMall.admin.orders.statuses.erase(
        connection,
        {
          orderId: order.id,
          statusId: fakeStatusId,
        },
      );
    },
  );
}
