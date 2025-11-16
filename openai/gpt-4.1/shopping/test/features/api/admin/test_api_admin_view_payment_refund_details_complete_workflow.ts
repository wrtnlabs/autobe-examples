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
 * Validate the complete administrator-driven workflow to view refund details
 * for a specific payment.
 *
 * 1. Register (join) a new administrator account and authenticate successfully.
 * 2. Create a payment record (admin context), referencing random but valid
 *    customer/provider UUIDs and including realistic payment data.
 * 3. Register a refund for that payment, using an appropriate refund amount,
 *    reason, and status.
 * 4. Fetch the specific refund details using paymentId and refundId, and validate
 *    correctness and business linkage.
 */
export async function test_api_admin_view_payment_refund_details_complete_workflow(
  connection: api.IConnection,
) {
  // 1. Register a new admin account (join) and authenticate
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const adminName: string = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);
  TestValidator.equals("admin email matches input", admin.email, adminEmail);
  TestValidator.predicate(
    "admin account has JWT token",
    typeof admin.token?.access === "string" && admin.token.access.length > 0,
  );

  // 2. Create a payment record using admin privileges
  const fakeCustomerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const fakeProviderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const paymentAmount = Math.floor(1000 + Math.random() * 9000);
  const paymentCurrency = RandomGenerator.pick(["KRW", "USD", "EUR"] as const);
  const paymentStatus = RandomGenerator.pick([
    "initiated",
    "pending",
    "authorized",
    "completed",
  ] as const);
  const externalPaymentId = RandomGenerator.alphaNumeric(12);
  const transactionToken = RandomGenerator.alphaNumeric(16);
  const requestedAt = new Date().toISOString();
  const paymentBody = {
    customer_id: fakeCustomerId,
    provider_id: fakeProviderId,
    amount: paymentAmount,
    currency: paymentCurrency,
    method_type: RandomGenerator.pick([
      "card",
      "e-wallet",
      "bank_transfer",
    ] as const),
    status: paymentStatus,
    external_payment_id: externalPaymentId,
    transaction_token: transactionToken,
    requested_at: requestedAt,
  } satisfies IShoppingMallPayment.ICreate;

  const payment: IShoppingMallPayment =
    await api.functional.shoppingMall.admin.payments.create(connection, {
      body: paymentBody,
    });
  typia.assert(payment);
  TestValidator.equals(
    "payment amount matches input",
    payment.amount,
    paymentAmount,
  );
  TestValidator.equals(
    "payment currency matches",
    payment.currency,
    paymentCurrency,
  );

  // 3. Create a refund for that payment
  const refundAmount = Math.floor(
    Math.min(paymentAmount, 1000 + Math.random() * 500),
  );
  const refundBody = {
    amount: refundAmount,
    currency: paymentCurrency,
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    status: RandomGenerator.pick([
      "requested",
      "pending",
      "processing",
    ] as const),
    external_refund_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallPaymentRefund.ICreate;

  const refund: IShoppingMallPaymentRefund =
    await api.functional.shoppingMall.admin.payments.refunds.create(
      connection,
      {
        paymentId: payment.id,
        body: refundBody,
      },
    );
  typia.assert(refund);
  TestValidator.equals(
    "refund payment summary matches original",
    refund.payment.id,
    payment.id,
  );
  TestValidator.equals(
    "refund amount matches input",
    refund.amount,
    refundBody.amount,
  );
  TestValidator.equals(
    "refund currency matches payment",
    refund.currency,
    payment.currency,
  );

  // 4. Retrieve refund details and validate integrity
  const refundDetails: IShoppingMallPaymentRefund =
    await api.functional.shoppingMall.admin.payments.refunds.at(connection, {
      paymentId: payment.id,
      refundId: refund.id,
    });
  typia.assert(refundDetails);
  TestValidator.equals(
    "refund details id matches created refund",
    refundDetails.id,
    refund.id,
  );
  TestValidator.equals(
    "refund details payment summary matches",
    refundDetails.payment.id,
    payment.id,
  );
  TestValidator.equals(
    "refund details amount matches created refund",
    refundDetails.amount,
    refund.amount,
  );
  TestValidator.equals(
    "refund details currency matches created refund",
    refundDetails.currency,
    refund.currency,
  );
}
