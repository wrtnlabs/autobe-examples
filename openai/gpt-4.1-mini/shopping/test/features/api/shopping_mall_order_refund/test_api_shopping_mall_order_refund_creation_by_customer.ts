import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefund";

export async function test_api_shopping_mall_order_refund_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. New customer registration
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "password123";
  const customerName = RandomGenerator.name();

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        full_name: customerName,
        ip: null,
        href: "https://example.com/signup",
        referrer: "https://google.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(authorizedCustomer);

  // 2. Customer creates a new shopping mall order
  const orderNumber = RandomGenerator.alphaNumeric(12);

  const newOrder: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.shoppingMallOrders.create(
      connection,
      {
        body: {
          order_number: orderNumber,
          status: "pending",
          payment_status: "pending",
          total_amount: RandomGenerator.pick([10000, 20000, 30000]),
        } satisfies IShoppingMallOrder.ICreate,
      },
    );
  typia.assert(newOrder);
  TestValidator.equals(
    "order_number should match",
    newOrder.order_number,
    orderNumber,
  );

  // 3. Customer submits a refund request linked to the created order
  const refundAmount = Math.min(
    newOrder.total_amount,
    RandomGenerator.pick([5000, 10000, 15000]),
  );
  const refundReason = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 7,
  });

  const refundRequest: IShoppingMallOrderRefund =
    await api.functional.shoppingMall.customer.shoppingMallOrderRefunds.create(
      connection,
      {
        body: {
          shoppingMallOrderId: newOrder.id,
          amount: refundAmount,
          reason: refundReason,
          status: "pending",
          adminNote: null,
        } satisfies IShoppingMallOrderRefund.ICreate,
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund request should reference correct order id",
    refundRequest.shoppingMallOrderId,
    newOrder.id,
  );
  TestValidator.equals(
    "refund amount should be correct",
    refundRequest.amount,
    refundAmount,
  );
  TestValidator.equals(
    "refund status should default to pending",
    refundRequest.status,
    "pending",
  );
  TestValidator.equals(
    "refund reason should match",
    refundRequest.reason,
    refundReason,
  );
}
