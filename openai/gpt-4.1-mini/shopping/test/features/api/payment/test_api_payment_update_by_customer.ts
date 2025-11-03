import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_payment_update_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer registers using join API to create a new authenticated user
  // 2. Customer places an order for shopping
  // 3. Customer creates a payment record for the order
  // 4. Customer updates the payment record with modified status and amount
  // 5. Validate the updated payment has correct fields updated
  // 6. Attempt unauthorized update with a different customer or unauthenticated connection
  // 7. Validate unauthorized update is rejected
  // All API responses are validated via typia.assert(), and important business fields are verified with TestValidator.

  // Step 1: Register a new customer to get authorization context
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "Password123!",
        nickname: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Step 2: Place an order for the customer
  const orderCreateBody = {
    order_code: `ORD-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
    shipping_address: `${RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 })} Street`,
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
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // Step 3: Create payment record for the order
  const paymentCreateBody = {
    shopping_mall_order_id: order.id,
    payment_method: "credit_card",
    payment_status: "pending",
    payment_amount: 10000,
    payment_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IShoppingMallPayment.ICreate;

  const payment: IShoppingMallPayment =
    await api.functional.shoppingMall.customer.payments.createPayment(
      connection,
      {
        body: paymentCreateBody,
      },
    );
  typia.assert(payment);

  // Step 4: Update payment with changed status and amount
  const paymentUpdateBody = {
    payment_method: "bank_transfer",
    payment_status: "completed",
    payment_amount: 9500,
    payment_date: new Date().toISOString(),
  } satisfies IShoppingMallPayment.IUpdate;

  const updatedPayment: IShoppingMallPayment =
    await api.functional.shoppingMall.customer.payments.updatePayment(
      connection,
      {
        id: payment.id,
        body: paymentUpdateBody,
      },
    );
  typia.assert(updatedPayment);

  // Step 5: Validate updated fields
  TestValidator.equals("payment id unchanged", updatedPayment.id, payment.id);
  TestValidator.equals(
    "payment method updated",
    updatedPayment.payment_method,
    paymentUpdateBody.payment_method,
  );
  TestValidator.equals(
    "payment status updated",
    updatedPayment.payment_status,
    paymentUpdateBody.payment_status,
  );
  TestValidator.equals(
    "payment amount updated",
    updatedPayment.payment_amount,
    paymentUpdateBody.payment_amount,
  );
  TestValidator.predicate(
    "payment date is valid ISO string",
    typeof updatedPayment.payment_date === "string" &&
      updatedPayment.payment_date.length > 0,
  );
  TestValidator.equals(
    "payment linked to correct order",
    updatedPayment.shopping_mall_order_id,
    order.id,
  );

  // Step 6: Attempt unauthorized update with a different customer
  // Create another customer
  const otherCustomerEmail = typia.random<string & tags.Format<"email">>();
  const otherCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: otherCustomerEmail,
        password: "Password123!",
        nickname: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(otherCustomer);

  // Try updating payment with other customer authorization
  await TestValidator.error(
    "unauthorized customer cannot update payment",
    async () => {
      await api.functional.shoppingMall.customer.payments.updatePayment(
        connection,
        {
          id: payment.id,
          body: paymentUpdateBody,
        },
      );
    },
  );

  // Step 7: Attempt unauthorized update with unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated cannot update payment",
    async () => {
      await api.functional.shoppingMall.customer.payments.updatePayment(
        unauthenticatedConnection,
        {
          id: payment.id,
          body: paymentUpdateBody,
        },
      );
    },
  );
}
