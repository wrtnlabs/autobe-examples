import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefund";

export async function test_api_shopping_mall_order_refund_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "strong_password_123";

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        name: RandomGenerator.name(),
        password: adminPassword,
        role: "admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin login to obtain authentication
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://homepage.example.com",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 3. Register customer user
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "customer_password_123";

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        full_name: RandomGenerator.name(),
        ip: null,
        href: "https://shop.example.com/signup",
        referrer: "https://homepage.example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 4. Customer login
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      ip: null,
      href: "https://shop.example.com/login",
      referrer: "https://homepage.example.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 5. Customer places a shopping mall order
  const orderNumber = RandomGenerator.alphaNumeric(12);
  const orderCreateBody = {
    order_number: orderNumber,
    status: "pending",
    payment_status: "pending",
    total_amount: 10000,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.shoppingMallOrders.create(
      connection,
      {
        body: orderCreateBody,
      },
    );
  typia.assert(order);
  TestValidator.equals(
    "order order_number matches",
    order.order_number,
    orderNumber,
  );

  // 6. Customer creates a refund request referencing the order
  const refundAmount = 5000;
  const refundReason = "Product defect";

  const refundCreateBody = {
    shoppingMallOrderId: order.id,
    amount: refundAmount,
    reason: refundReason,
    status: "pending",
  } satisfies IShoppingMallOrderRefund.ICreate;

  const refundRequest: IShoppingMallOrderRefund =
    await api.functional.shoppingMall.customer.shoppingMallOrderRefunds.create(
      connection,
      {
        body: refundCreateBody,
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund order id matches",
    refundRequest.shoppingMallOrderId,
    order.id,
  );
  TestValidator.equals(
    "refund amount matches",
    refundRequest.amount,
    refundAmount,
  );
  TestValidator.equals(
    "refund status is pending",
    refundRequest.status,
    "pending",
  );

  // 7. Switch back to admin user by re-authenticating admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://homepage.example.com",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 8. Admin updates the refund request
  const approvalNote = "Approved after inspection";
  const currentTimestamp = new Date().toISOString();

  const refundUpdateBody = {
    status: "approved",
    approval_note: approvalNote,
    approved_at: currentTimestamp,
  } satisfies IShoppingMallOrderRefund.IUpdate;

  const updatedRefund: IShoppingMallOrderRefund =
    await api.functional.shoppingMall.admin.shoppingMallOrderRefunds.update(
      connection,
      {
        shoppingMallOrderRefundId: refundRequest.id,
        body: refundUpdateBody,
      },
    );
  typia.assert(updatedRefund);

  // Validate the updated refund properties
  TestValidator.equals("refund id matches", updatedRefund.id, refundRequest.id);
  TestValidator.equals(
    "refund status updated",
    updatedRefund.status,
    "approved",
  );
  TestValidator.equals(
    "refund approval note updated",
    updatedRefund.approval_note,
    approvalNote,
  );
  TestValidator.equals(
    "refund approved_at set",
    updatedRefund.approved_at,
    currentTimestamp,
  );
}
