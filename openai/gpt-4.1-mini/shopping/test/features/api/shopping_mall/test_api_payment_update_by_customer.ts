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
  // 1. Register a new customer account to obtain authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "strong_password_123",
        nickname: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create a new order for the authenticated customer
  const orderBody = {
    order_code: RandomGenerator.alphaNumeric(12),
    shipping_address: `${RandomGenerator.paragraph({ sentences: 3 })} Seoul, South Korea`,
    shopping_mall_order_items: [
      {
        shopping_mall_product_sku_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        quantity: RandomGenerator.alphaNumeric(1).length > 0 ? 1 : 1, // always 1
        unit_price: 10000,
        total_price: 10000,
      },
    ],
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 3. Create a new payment for the created order
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

  // 4. Update the payment record with modified properties
  const paymentUpdateBody = {
    payment_method: "bank_transfer",
    payment_status: "completed",
    payment_amount: 10000,
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

  // 5. Validate updated payment properties
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
  TestValidator.equals(
    "payment date updated",
    updatedPayment.payment_date,
    paymentUpdateBody.payment_date,
  );
  TestValidator.equals(
    "payment linked to correct order",
    updatedPayment.shopping_mall_order_id,
    order.id,
  );
}
