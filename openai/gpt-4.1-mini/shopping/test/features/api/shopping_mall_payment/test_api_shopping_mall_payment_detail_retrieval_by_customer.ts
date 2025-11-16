import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";

export async function test_api_shopping_mall_payment_detail_retrieval_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer registration and login
  const customerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongP@ssw0rd123",
    full_name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/signup",
    referrer: "https://shop.example.com/home",
  } satisfies IShoppingMallCustomer.ICreate;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBody,
    });
  typia.assert(authorizedCustomer);

  // 2. Create a payment linked to existing order ID
  // We assume an existing valid order ID (simulate generation)
  const newPaymentBody = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    payment_method: RandomGenerator.pick([
      "card",
      "bank_transfer",
      "paypal",
      "cash",
      "other",
    ] as const),
    amount: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1>
    >() satisfies number as number,
    status: RandomGenerator.pick([
      "pending",
      "completed",
      "failed",
      "cancelled",
      "refunded",
    ] as const),
    transaction_id: null,
  } satisfies IShoppingMallPayment.ICreate;

  const createdPayment: IShoppingMallPayment =
    await api.functional.shoppingMall.customer.shoppingMallPayments.create(
      connection,
      {
        body: newPaymentBody,
      },
    );
  typia.assert(createdPayment);

  // 3. Retrieve payment details by payment ID
  const retrievedPayment: IShoppingMallPayment =
    await api.functional.shoppingMall.customer.shoppingMallPayments.at(
      connection,
      {
        shoppingMallPaymentId: createdPayment.id,
      },
    );
  typia.assert(retrievedPayment);

  // 4. Validate retrieved payment matches created payment
  TestValidator.equals(
    "Payment ID matches",
    retrievedPayment.id,
    createdPayment.id,
  );
  TestValidator.equals(
    "Order ID matches",
    retrievedPayment.shopping_mall_order_id,
    createdPayment.shopping_mall_order_id,
  );
  TestValidator.equals(
    "Payment method matches",
    retrievedPayment.payment_method,
    createdPayment.payment_method,
  );
  TestValidator.equals(
    "Amount matches",
    retrievedPayment.amount,
    createdPayment.amount,
  );
  TestValidator.equals(
    "Status matches",
    retrievedPayment.status,
    createdPayment.status,
  );
  TestValidator.equals(
    "Transaction ID matches",
    retrievedPayment.transaction_id,
    createdPayment.transaction_id,
  );
  TestValidator.equals(
    "Created timestamp matches",
    retrievedPayment.created_at,
    createdPayment.created_at,
  );
  TestValidator.equals(
    "Updated timestamp matches",
    retrievedPayment.updated_at,
    createdPayment.updated_at,
  );
  TestValidator.equals(
    "Deleted timestamp matches",
    retrievedPayment.deleted_at,
    createdPayment.deleted_at,
  );
}
