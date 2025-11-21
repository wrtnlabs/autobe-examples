import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";

/**
 * Validate administrator's ability to retrieve detailed payment information for
 * specific orders.
 *
 * This test creates an administrator account, establishes payment records, and
 * verifies comprehensive payment data retrieval including transaction details,
 * gateway information, status history, and associated order context. The test
 * ensures administrators can access complete payment information for financial
 * reconciliation and customer support.
 */
export async function test_api_admin_order_payment_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ read: true, write: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a payment record for retrieval testing
  // Use a realistic order ID format (in real scenario, this would come from actual order creation)
  const orderId = typia.random<string & tags.Format<"uuid">>();

  const paymentMethods = [
    "credit_card",
    "paypal",
    "bank_transfer",
    "digital_wallet",
  ] as const;
  const paymentStatuses = [
    "pending",
    "authorized",
    "captured",
    "declined",
    "refunded",
    "disputed",
    "chargeback",
  ] as const;
  const currencies = ["USD", "EUR", "GBP", "JPY", "KRW"] as const;
  const gateways = ["Stripe", "PayPal", "Square", "Adyen"] as const;

  const paymentData = {
    payment_method: RandomGenerator.pick(paymentMethods),
    payment_gateway: RandomGenerator.pick(gateways),
    transaction_id: `txn_${Date.now()}_${RandomGenerator.alphaNumeric(8)}`,
    amount: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<50000>
    >(),
    currency: RandomGenerator.pick(currencies),
    status: RandomGenerator.pick(paymentStatuses),
    authorization_code: RandomGenerator.pick([
      undefined,
      `auth_${RandomGenerator.alphaNumeric(12)}`,
    ]),
    payment_details: RandomGenerator.pick([
      undefined,
      JSON.stringify({
        token: RandomGenerator.alphaNumeric(20),
        last4: RandomGenerator.alphaNumeric(4),
        brand: RandomGenerator.pick(["visa", "mastercard", "amex"]),
      }),
    ]),
  } satisfies IShoppingMallPayment.ICreate;

  const createdPayment =
    await api.functional.shoppingMall.admin.orders.payments.create(connection, {
      orderId: orderId,
      body: paymentData,
    });
  typia.assert(createdPayment);

  // Step 3: Retrieve the payment details using the payment retrieval endpoint
  const retrievedPayment =
    await api.functional.shoppingMall.admin.orders.payments.at(connection, {
      orderId: orderId,
      paymentId: createdPayment.id,
    });
  typia.assert(retrievedPayment);

  // Step 4: Validate that retrieved payment matches created payment
  TestValidator.equals(
    "payment ID should match",
    retrievedPayment.id,
    createdPayment.id,
  );
  TestValidator.equals(
    "payment method should match",
    retrievedPayment.payment_method,
    paymentData.payment_method,
  );
  TestValidator.equals(
    "payment gateway should match",
    retrievedPayment.payment_gateway,
    paymentData.payment_gateway,
  );
  TestValidator.equals(
    "transaction ID should match",
    retrievedPayment.transaction_id,
    paymentData.transaction_id,
  );
  TestValidator.equals(
    "amount should match",
    retrievedPayment.amount,
    paymentData.amount,
  );
  TestValidator.equals(
    "currency should match",
    retrievedPayment.currency,
    paymentData.currency,
  );
  TestValidator.equals(
    "status should match",
    retrievedPayment.status,
    paymentData.status,
  );

  // Validate optional fields if they were provided
  if (paymentData.authorization_code !== undefined) {
    TestValidator.equals(
      "authorization code should match",
      retrievedPayment.authorization_code,
      paymentData.authorization_code,
    );
  } else {
    TestValidator.equals(
      "authorization code should be undefined when not provided",
      retrievedPayment.authorization_code,
      undefined,
    );
  }

  if (paymentData.payment_details !== undefined) {
    TestValidator.equals(
      "payment details should match",
      retrievedPayment.payment_details,
      paymentData.payment_details,
    );
  } else {
    TestValidator.equals(
      "payment details should be undefined when not provided",
      retrievedPayment.payment_details,
      undefined,
    );
  }

  // Validate timestamp fields are properly set and in correct format
  TestValidator.predicate(
    "created_at should be valid ISO date-time string",
    retrievedPayment.created_at !== undefined &&
      retrievedPayment.created_at.length > 0 &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedPayment.created_at),
  );

  TestValidator.predicate(
    "updated_at should be valid ISO date-time string",
    retrievedPayment.updated_at !== undefined &&
      retrievedPayment.updated_at.length > 0 &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedPayment.updated_at),
  );

  // Validate financial constraints
  TestValidator.predicate(
    "amount should be positive",
    retrievedPayment.amount > 0,
  );
  TestValidator.predicate(
    "currency should be 3-letter code",
    retrievedPayment.currency.length === 3 &&
      /^[A-Z]{3}$/.test(retrievedPayment.currency),
  );

  // Validate that refunded_amount is either undefined or valid
  if (retrievedPayment.refunded_amount !== undefined) {
    TestValidator.predicate(
      "refunded_amount should be non-negative",
      retrievedPayment.refunded_amount >= 0,
    );
    TestValidator.predicate(
      "refunded_amount should not exceed original amount",
      retrievedPayment.refunded_amount <= retrievedPayment.amount,
    );
  }

  // Validate that captured_at is either undefined or valid ISO string
  if (retrievedPayment.captured_at !== undefined) {
    TestValidator.predicate(
      "captured_at should be valid ISO date-time string",
      retrievedPayment.captured_at.length > 0 &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
          retrievedPayment.captured_at,
        ),
    );
  }
}
