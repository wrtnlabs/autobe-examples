import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallExternalPaymentProvider } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallExternalPaymentProvider";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";

/**
 * Validate rejection of refund requests that exceed the original payment
 * amount.
 *
 * 1. Admin registers to obtain authentication.
 * 2. Admin creates a valid payment with a generated amount.
 * 3. Admin attempts to request a refund for that payment, with an amount greater
 *    than original payment amount.
 * 4. Assert that the refund operation is rejected with an error (business rule
 *    enforced).
 * 5. Optionally, confirm that no refund record was created (if a fetch-list API
 *    existed for refunds, but not required here).
 */
export async function test_api_payment_refund_amount_exceeds_original(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = RandomGenerator.alphaNumeric(10) + "@test.com";
  const adminPassword = RandomGenerator.alphaNumeric(12) + "1!A";
  const adminName = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail as string & tags.Format<"email">,
      password: adminPassword as string &
        tags.MinLength<8> &
        tags.Format<"password">,
      name: adminName as string & tags.MinLength<1>,
    },
  });
  typia.assert(admin);

  // 2. Create a payment
  // Simulate minimal payment prerequisites
  const paymentBody = {
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    provider_id: typia.random<string & tags.Format<"uuid">>(),
    amount: 1000,
    currency: "KRW",
    method_type: "card",
    status: "completed",
    external_payment_id: RandomGenerator.alphaNumeric(12),
    transaction_token: RandomGenerator.alphaNumeric(16),
    requested_at: new Date().toISOString() as string & tags.Format<"date-time">,
  };
  const payment = await api.functional.shoppingMall.admin.payments.create(
    connection,
    {
      body: paymentBody,
    },
  );
  typia.assert(payment);

  // 3. Attempt refund with excessive amount
  const excessiveAmount = payment.amount + 1;
  const refundBody = {
    amount: excessiveAmount,
    currency: payment.currency,
    reason: "Test over-refund prevention",
    status: "requested",
    external_refund_id: RandomGenerator.alphaNumeric(16),
  };
  await TestValidator.error(
    "should reject refund amount exceeding original payment",
    async () => {
      await api.functional.shoppingMall.admin.payments.refunds.create(
        connection,
        {
          paymentId: payment.id,
          body: refundBody,
        },
      );
    },
  );
}
