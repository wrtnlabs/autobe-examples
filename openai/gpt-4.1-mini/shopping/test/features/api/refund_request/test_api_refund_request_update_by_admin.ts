import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";

export async function test_api_refund_request_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Customer registration
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "StrongPassword123",
        href: "http://localhost/signup",
        referrer: "http://localhost/home",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Customer login
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "StrongPassword123",
      href: "http://localhost/login",
      referrer: "http://localhost/home",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 3. Customer creates an order
  const orderRequestBody = {
    order_number: RandomGenerator.alphaNumeric(12),
    order_status: "pending",
    payment_status: "pending",
    total_amount: 12345,
    shipping_address: "123 Main St, City, Country",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderRequestBody,
    });
  typia.assert(order);
  TestValidator.equals(
    "order status is pending",
    order.order_status,
    "pending",
  );

  // 4. Customer creates a refund request for the order
  const refundRequestCreateBody = {
    shopping_mall_order_id: order.id,
    refund_amount: 1000,
    refund_reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallRefundRequest.ICreate;

  const refundRequest: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.customer.refundRequests.create(
      connection,
      {
        body: refundRequestCreateBody,
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund request refund amount",
    refundRequest.refund_amount,
    refundRequestCreateBody.refund_amount,
  );

  // 5. Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminStrongPassword123",
        ip: null,
        href: "http://localhost/admin/signup",
        referrer: "http://localhost/admin/home",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 6. Admin login
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminStrongPassword123",
      ip: null,
      href: "http://localhost/admin/login",
      referrer: "http://localhost/admin/home",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 7. Admin updates the refund request
  const refundRequestUpdateBody = {
    refund_amount: 2000,
    refund_reason: RandomGenerator.paragraph({ sentences: 4 }),
    refund_status: "approved",
    processed_at: new Date().toISOString(),
  } satisfies IShoppingMallRefundRequest.IUpdate;

  const updatedRefundRequest: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.admin.refundRequests.update(connection, {
      refundRequestId: refundRequest.id,
      body: refundRequestUpdateBody,
    });
  typia.assert(updatedRefundRequest);

  // 8. Assert updated values
  TestValidator.equals(
    "updated refund amount",
    updatedRefundRequest.refund_amount,
    refundRequestUpdateBody.refund_amount!,
  );
  TestValidator.equals(
    "updated refund reason",
    updatedRefundRequest.refund_reason,
    refundRequestUpdateBody.refund_reason!,
  );
  TestValidator.equals(
    "updated refund status",
    updatedRefundRequest.refund_status,
    refundRequestUpdateBody.refund_status!,
  );
  TestValidator.equals(
    "updated processed at",
    updatedRefundRequest.processed_at,
    refundRequestUpdateBody.processed_at!,
  );
}
