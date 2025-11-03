import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import type { IShoppingMallOrderHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderHistory";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReturnShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnShipment";
import type { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";
import type { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";

export async function test_api_order_cancellation_retrieve_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin1234",
        full_name: "Admin User",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Assign admin role to admin user
  const userRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: {
        user_id: admin.id,
        role_name: "admin",
      } satisfies IShoppingMallUserRole.ICreate,
    });
  typia.assert(userRole);

  // 3. Customer joins
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "customer1234",
        nickname: "cust_nickname",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 4. Customer places an order
  const orderBody: IShoppingMallOrder.ICreate = {
    order_code: `ORD-${Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, "0")}`,
    shipping_address: "123 Customer Street, Seoul, South Korea",
    shopping_mall_order_items: [
      {
        shopping_mall_product_sku_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        quantity: 1,
        unit_price: 10000,
        total_price: 10000,
      } satisfies IShoppingMallOrderItem.ICreate,
    ],
  };
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 5. Create an order cancellation - simulated by creating a cancellation request manually
  // Since no create API for cancellation, simulate by assuming that an orderCancellationId exists

  // Simulate cancellation data (for retrieval later)
  const cancellationRequest: IShoppingMallOrderCancellation = {
    id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_order_id: order.id,
    shopping_mall_customer_id: customer.id,
    cancellation_reason: "Changed mind",
    cancellation_status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Normally the cancellation would be created by a dedicated API
  // But here we test retrieval, so we use its ID
  // 6. Switch to admin user to test retrieval
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "admin1234",
      ip: null,
      href: "http://localhost/admin",
      referrer: "http://localhost/login",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 7. Retrieve the cancellation through admin API
  const retrievedCancellation: IShoppingMallOrderCancellation =
    await api.functional.shoppingMall.admin.orderCancellations.at(connection, {
      orderCancellationId: cancellationRequest.id,
    });
  typia.assert(retrievedCancellation);

  // 8. Validate retrieved data
  TestValidator.equals(
    "retrieved cancellation id matches",
    retrievedCancellation.id,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "retrieved cancellation reason matches",
    retrievedCancellation.cancellation_reason,
    cancellationRequest.cancellation_reason,
  );
  TestValidator.equals(
    "retrieved cancellation status matches",
    retrievedCancellation.cancellation_status,
    cancellationRequest.cancellation_status,
  );
  TestValidator.equals(
    "retrieved cancellation order id matches",
    retrievedCancellation.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "retrieved cancellation customer id matches",
    retrievedCancellation.shopping_mall_customer_id,
    customer.id,
  );

  // 9. Test error handling when cancellation not found
  await TestValidator.error("not found cancellation", async () => {
    await api.functional.shoppingMall.admin.orderCancellations.at(connection, {
      orderCancellationId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
