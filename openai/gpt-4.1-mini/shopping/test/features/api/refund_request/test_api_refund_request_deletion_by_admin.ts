import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";

export async function test_api_refund_request_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Create a customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: "1234",
    href: "https://example.com/signup",
    referrer: "https://example.com",
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 2. Customer places an order
  const orderBody: IShoppingMallOrder.ICreate = {
    order_number: RandomGenerator.alphaNumeric(12),
    order_status: "pending",
    payment_status: "pending",
    total_amount: 10000,
    shipping_address: "123 Test St, Test City, Test Country",
  };
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 3. Customer creates a refund request for the order
  const refundRequestBody: IShoppingMallRefundRequest.ICreate = {
    shopping_mall_order_id: order.id,
    refund_amount: 10000,
    refund_reason: "Reason for refund",
  };
  const refundRequest: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.customer.refundRequests.create(
      connection,
      { body: refundRequestBody },
    );
  typia.assert(refundRequest);

  // 4. Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody: IShoppingMallAdmin.IJoin = {
    email: adminEmail,
    password: "1234",
    ip: null,
    href: "https://example.com/admin/signup",
    referrer: "https://example.com",
  };
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 5. Admin logs in
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "1234",
      ip: null,
      href: "https://example.com/admin/login",
      referrer: "https://example.com",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 6. Admin deletes the refund request
  await api.functional.shoppingMall.admin.refundRequests.erase(connection, {
    refundRequestId: refundRequest.id,
  });
}
