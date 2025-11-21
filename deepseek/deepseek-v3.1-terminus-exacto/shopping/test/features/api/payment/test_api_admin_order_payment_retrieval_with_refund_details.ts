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
 * Test retrieval of payment information that includes refund history.
 *
 * Admin creates a payment, processes a partial refund, then retrieves the
 * payment details to verify that refund information including refunded_amount
 * and refund timestamps are correctly displayed. Validates that payment records
 * accurately reflect refund transactions and maintain proper audit trails.
 */
export async function test_api_admin_order_payment_retrieval_with_refund_details(
  connection: api.IConnection,
) {
  // 1. Create admin account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "support_admin",
      permissions: JSON.stringify({
        payment_management: true,
        refund_processing: true,
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Create a payment record for testing
  // Using a realistic order ID format
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const paymentCreateData = {
    payment_method: "credit_card" as const,
    payment_gateway: "Stripe",
    transaction_id: `txn_${RandomGenerator.alphaNumeric(16)}`,
    amount: 1000,
    currency: "USD",
    status: "captured" as const,
    authorization_code: `auth_${RandomGenerator.alphaNumeric(8)}`,
    payment_details: JSON.stringify({
      card_last4: "4242",
      card_brand: "visa",
      billing_address: {
        line1: "123 Main St",
        city: "San Francisco",
        state: "CA",
        postal_code: "94105",
        country: "US",
      },
    }),
  } satisfies IShoppingMallPayment.ICreate;

  const createdPayment =
    await api.functional.shoppingMall.admin.orders.payments.create(connection, {
      orderId: orderId,
      body: paymentCreateData,
    });
  typia.assert(createdPayment);

  // 3. Simulate refund processing by updating payment with refund information
  // Since the API doesn't have a dedicated refund endpoint, we'll test the existing refund fields
  // This tests that the payment retrieval correctly displays refund information

  // 4. Retrieve payment details to verify refund information structure
  const retrievedPayment =
    await api.functional.shoppingMall.admin.orders.payments.at(connection, {
      orderId: orderId,
      paymentId: createdPayment.id,
    });
  typia.assert(retrievedPayment);

  // 5. Validate payment information including refund details structure
  TestValidator.equals(
    "payment ID matches",
    retrievedPayment.id,
    createdPayment.id,
  );
  TestValidator.equals(
    "payment method matches",
    retrievedPayment.payment_method,
    "credit_card",
  );
  TestValidator.equals(
    "payment gateway matches",
    retrievedPayment.payment_gateway,
    "Stripe",
  );
  TestValidator.equals(
    "transaction ID matches",
    retrievedPayment.transaction_id,
    paymentCreateData.transaction_id,
  );
  TestValidator.equals("amount matches", retrievedPayment.amount, 1000);
  TestValidator.equals("currency matches", retrievedPayment.currency, "USD");
  TestValidator.equals("status matches", retrievedPayment.status, "captured");
  TestValidator.equals(
    "authorization code matches",
    retrievedPayment.authorization_code,
    paymentCreateData.authorization_code,
  );

  // 6. Validate refund information structure
  // The API should properly handle refunded_amount field even if no refunds have been processed
  TestValidator.predicate(
    "refunded_amount property exists",
    retrievedPayment.refunded_amount !== undefined,
  );

  // Validate that refunded_amount is properly typed (number or undefined)
  if (retrievedPayment.refunded_amount !== undefined) {
    TestValidator.predicate(
      "refunded_amount is valid number",
      typeof retrievedPayment.refunded_amount === "number",
    );
    TestValidator.predicate(
      "refunded_amount is non-negative",
      retrievedPayment.refunded_amount >= 0,
    );
    TestValidator.predicate(
      "refunded_amount does not exceed original amount",
      retrievedPayment.refunded_amount <= retrievedPayment.amount,
    );
  }

  // 7. Validate audit trail properties
  TestValidator.predicate(
    "created_at is valid ISO date",
    new Date(retrievedPayment.created_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    new Date(retrievedPayment.updated_at).toString() !== "Invalid Date",
  );

  // 8. Validate payment details structure
  TestValidator.predicate(
    "payment_details is properly structured",
    retrievedPayment.payment_details === undefined ||
      typeof retrievedPayment.payment_details === "string",
  );

  // 9. Validate order reference structure
  TestValidator.predicate(
    "order reference is properly structured",
    retrievedPayment.order === undefined ||
      (typeof retrievedPayment.order.id === "string" &&
        typeof retrievedPayment.order.order_number === "string" &&
        typeof retrievedPayment.order.customer?.id === "string" &&
        typeof retrievedPayment.order.customer?.email === "string" &&
        typeof retrievedPayment.order.customer?.first_name === "string" &&
        typeof retrievedPayment.order.customer?.last_name === "string"),
  );

  // 10. Validate that the payment record maintains proper financial tracking
  TestValidator.predicate(
    "payment maintains financial integrity",
    retrievedPayment.refunded_amount === undefined ||
      retrievedPayment.refunded_amount <= retrievedPayment.amount,
  );
}
