import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";

/**
 * Validate that a new customer can join and then create a shopping mall
 * payment.
 *
 * This end-to-end test covers the typical customer payment creation flow:
 *
 * 1. Perform customer join operation to register and authenticate user.
 * 2. Use the authorized customer context to create a new payment record.
 * 3. Verify that the payment creation returns valid data matching
 *    IShoppingMallPayment.
 *
 * The test ensures business rules regarding payment creation are met,
 * authentication is properly handled, and response data is valid.
 */
export async function test_api_shopping_mall_payments_creation_by_customer(
  connection: api.IConnection,
) {
  // Perform customer registration and authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "StrongP@ssw0rd!",
        full_name: RandomGenerator.name(),
        ip: null,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Create a new shopping mall payment record
  // note: as there's no order ID provided from inputs, generate a realistic UUID for shopping_mall_order_id
  const paymentCreateBody = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    payment_method: RandomGenerator.pick([
      "card",
      "bank_transfer",
      "paypal",
      "cash",
      "other",
    ] as const),
    amount: typia.random<number & tags.Minimum<0>>(),
    status: RandomGenerator.pick([
      "pending",
      "completed",
      "failed",
      "cancelled",
      "refunded",
    ] as const),
    transaction_id: null,
  } satisfies IShoppingMallPayment.ICreate;

  const payment: IShoppingMallPayment =
    await api.functional.shoppingMall.customer.shoppingMallPayments.create(
      connection,
      {
        body: paymentCreateBody,
      },
    );
  typia.assert(payment);

  // Validate that the returned payment's properties match the creation input where applicable
  TestValidator.equals(
    "shopping mall payment's order ID matches",
    payment.shopping_mall_order_id,
    paymentCreateBody.shopping_mall_order_id,
  );
  TestValidator.equals(
    "shopping mall payment's method matches",
    payment.payment_method,
    paymentCreateBody.payment_method,
  );
  TestValidator.equals(
    "shopping mall payment's amount matches",
    payment.amount,
    paymentCreateBody.amount,
  );
  TestValidator.equals(
    "shopping mall payment's status matches",
    payment.status,
    paymentCreateBody.status,
  );
}
