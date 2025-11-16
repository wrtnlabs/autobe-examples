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
 * Validates the admin-initiated payment refund creation process, including
 * setup, refund business rules, and audit linkages.
 *
 * This scenario tests:
 *
 * - Admin authentication and registration for privileged payment operations
 * - Creation of a payment record for a random customer via the admin API
 * - Creating a refund with required amount, status, and reason for the payment
 * - Verifying business constraints on refund creation (amount cannot exceed
 *   payment)
 * - Ensuring audit trail by fully linking the refund to both payment and admin
 *   actor
 * - Validation of all required fields and business status transitions
 *
 * Steps:
 *
 * 1. Register and authenticate as admin
 * 2. Synthesize a payment entity (reference customer/provider)
 * 3. Create a refund (required amount, reason, status) for the payment
 * 4. Assert refund amount <= payment, and all linkage/audit fields present,
 *    referential integrity maintained
 */
export async function test_api_payment_refund_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12) + "!#A";
  const adminName = RandomGenerator.name();
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
  TestValidator.equals("admin name matches input", admin.name, adminName);
  TestValidator.predicate("admin status is not empty", admin.status.length > 0);
  TestValidator.predicate(
    "admin token is present",
    typeof admin.token.access === "string" && admin.token.access.length > 0,
  );

  // 2. Synthesize payment entity (simulate customer/provider references)
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const providerId = typia.random<string & tags.Format<"uuid">>();
  const paymentAmount = 50000;
  const paymentCurrency = "KRW";
  const paymentMethod = RandomGenerator.pick([
    "card",
    "e-wallet",
    "bank_transfer",
  ] as const);
  const externalPaymentId = RandomGenerator.alphaNumeric(16);
  const transactionToken = RandomGenerator.alphaNumeric(32);
  const requestedAt = new Date().toISOString();
  const paymentCreateBody = {
    customer_id: customerId,
    provider_id: providerId,
    amount: paymentAmount,
    currency: paymentCurrency,
    method_type: paymentMethod,
    status: "initiated",
    external_payment_id: externalPaymentId,
    transaction_token: transactionToken,
    requested_at: requestedAt,
  } satisfies IShoppingMallPayment.ICreate;

  const payment: IShoppingMallPayment =
    await api.functional.shoppingMall.admin.payments.create(connection, {
      body: paymentCreateBody,
    });
  typia.assert(payment);
  TestValidator.equals("payment.amount matches", payment.amount, paymentAmount);
  TestValidator.equals(
    "payment.currency matches",
    payment.currency,
    paymentCurrency,
  );
  TestValidator.equals(
    'payment.status is "initiated"',
    payment.status,
    "initiated",
  );
  TestValidator.equals(
    "payment.external_payment_id matches",
    payment.external_payment_id,
    externalPaymentId,
  );

  // 3. Create refund for that payment
  const refundAmount = payment.amount; // for positive scenario, use full amount
  const refundCurrency = payment.currency;
  const refundReason = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const refundStatus = "requested";
  const refundExternalId = RandomGenerator.alphaNumeric(18);
  const refundBody = {
    amount: refundAmount,
    currency: refundCurrency,
    reason: refundReason,
    status: refundStatus,
    external_refund_id: refundExternalId,
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
    "refund.payment.id == payment.id",
    refund.payment.id,
    payment.id,
  );
  TestValidator.equals("refund.amount matches", refund.amount, refundAmount);
  TestValidator.equals(
    "refund.currency matches",
    refund.currency,
    refundCurrency,
  );
  TestValidator.equals(
    'refund.status is "requested"',
    refund.status,
    refundStatus,
  );
  TestValidator.equals("refund.reason matches", refund.reason, refundReason);
  TestValidator.predicate(
    "refund.processed_by_admin is present",
    refund.processed_by_admin !== null &&
      refund.processed_by_admin !== undefined,
  );
  TestValidator.equals(
    "refund.processed_by_admin.id == admin.id",
    refund.processed_by_admin!.id,
    admin.id,
  );
  TestValidator.predicate(
    "refund external_refund_id valid",
    refund.external_refund_id.length > 0,
  );
  TestValidator.predicate(
    "refund.requested_at is ISO string",
    typeof refund.requested_at === "string" && refund.requested_at.length > 0,
  );
  TestValidator.predicate(
    "refund.created_at is ISO string",
    typeof refund.created_at === "string" && refund.created_at.length > 0,
  );

  // 4. Negative test: refund amount over original payment should fail
  await TestValidator.error(
    "refund exceeding original payment amount should fail",
    async () => {
      await api.functional.shoppingMall.admin.payments.refunds.create(
        connection,
        {
          paymentId: payment.id,
          body: {
            amount: payment.amount + 1,
            currency: payment.currency,
            reason: "Test exceeding original payment",
            status: refundStatus,
            external_refund_id: RandomGenerator.alphaNumeric(18),
          } satisfies IShoppingMallPaymentRefund.ICreate,
        },
      );
    },
  );
}
