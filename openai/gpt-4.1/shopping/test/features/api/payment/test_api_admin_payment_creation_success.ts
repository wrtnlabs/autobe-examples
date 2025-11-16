import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallExternalPaymentProvider } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallExternalPaymentProvider";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";

/**
 * Validate that an admin can create a new payment record for a shopping mall
 * order with all required fields.
 *
 * 1. Register a new admin account and authenticate as admin.
 * 2. With the admin context, create a payment with all mandatory properties:
 *
 *    - Valid customer_id (UUID)
 *    - Valid provider_id (UUID)
 *    - Positive amount
 *    - ISO 4217 currency code
 *    - Method type (e.g., 'card')
 *    - Status ('initiated')
 *    - Unique external_payment_id string
 *    - Unique transaction_token string
 *    - Current requested_at timestamp in ISO format
 * 3. Validate response: payment is created; status is 'initiated'; details match
 *    input.
 */
export async function test_api_admin_payment_creation_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin account (join)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
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

  // 2. Prepare required references
  // As we do not have API for creating customer and provider, simulate random valid UUIDs and required strings
  const customer_id: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const provider_id: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Build payment creation request
  const paymentCreateBody = {
    customer_id,
    provider_id,
    amount: 10000 + Math.floor(Math.random() * 90000), // positive amount
    currency: RandomGenerator.pick(["USD", "KRW", "EUR"] as const),
    method_type: RandomGenerator.pick([
      "card",
      "e-wallet",
      "bank_transfer",
    ] as const),
    status: "initiated",
    external_payment_id: RandomGenerator.alphaNumeric(24),
    transaction_token: RandomGenerator.alphaNumeric(36),
    requested_at: new Date().toISOString(),
  } satisfies IShoppingMallPayment.ICreate;

  // 4. Create payment as admin
  const payment: IShoppingMallPayment =
    await api.functional.shoppingMall.admin.payments.create(connection, {
      body: paymentCreateBody,
    });
  typia.assert(payment);

  // 5. Validate: status is 'initiated', returned fields match input
  TestValidator.equals(
    "payment status is 'initiated'",
    payment.status,
    "initiated",
  );
  TestValidator.equals(
    "payment customer id matches",
    payment.customer.id,
    customer_id,
  );
  TestValidator.equals(
    "payment provider id matches",
    payment.provider.id,
    provider_id,
  );
  TestValidator.equals(
    "payment amount matches",
    payment.amount,
    paymentCreateBody.amount,
  );
  TestValidator.equals(
    "payment currency matches",
    payment.currency,
    paymentCreateBody.currency,
  );
  TestValidator.equals(
    "payment method_type matches",
    payment.method_type,
    paymentCreateBody.method_type,
  );
  TestValidator.equals(
    "payment external_payment_id matches",
    payment.external_payment_id,
    paymentCreateBody.external_payment_id,
  );
  TestValidator.equals(
    "payment transaction_token matches",
    payment.transaction_token,
    paymentCreateBody.transaction_token,
  );
  // requested_at may differ slightly (system logic may adjust), so check within range is not required
}
