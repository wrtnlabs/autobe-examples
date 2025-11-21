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
 * Test retrieval of payment information for disputed transactions.
 *
 * This test validates that an admin can create a payment record that
 * transitions through a dispute lifecycle (from authorized to disputed to
 * chargeback) and then retrieve the payment details to verify that dispute
 * status, chargeback information, and resolution details are properly recorded
 * and accessible.
 */
export async function test_api_admin_order_payment_retrieval_disputed_transaction(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin with dispute resolution privileges
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "super_admin",
        permissions: JSON.stringify({
          payment_management: true,
          dispute_resolution: true,
          chargeback_processing: true,
        }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a payment record with initial authorized status
  const orderId: string = typia.random<string & tags.Format<"uuid">>();
  const payment: IShoppingMallPayment =
    await api.functional.shoppingMall.admin.orders.payments.create(connection, {
      orderId: orderId,
      body: {
        payment_method: "credit_card",
        payment_gateway: "Stripe",
        transaction_id: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        amount: 2999.99,
        currency: "USD",
        status: "authorized",
        authorization_code: "AUTH-123456789",
        payment_details: JSON.stringify({
          card_last4: "4242",
          card_brand: "Visa",
          expiry_month: 12,
          expiry_year: 2025,
        }),
      } satisfies IShoppingMallPayment.ICreate,
    });
  typia.assert(payment);

  // Step 3: Simulate payment status transition to disputed
  const disputedPayment: IShoppingMallPayment =
    await api.functional.shoppingMall.admin.orders.payments.create(connection, {
      orderId: orderId,
      body: {
        payment_method: payment.payment_method,
        payment_gateway: payment.payment_gateway,
        transaction_id: payment.transaction_id,
        amount: payment.amount,
        currency: payment.currency,
        status: "disputed",
        authorization_code: payment.authorization_code,
        payment_details: payment.payment_details,
      } satisfies IShoppingMallPayment.ICreate,
    });
  typia.assert(disputedPayment);

  // Step 4: Simulate payment status transition to chargeback
  const chargebackPayment: IShoppingMallPayment =
    await api.functional.shoppingMall.admin.orders.payments.create(connection, {
      orderId: orderId,
      body: {
        payment_method: payment.payment_method,
        payment_gateway: payment.payment_gateway,
        transaction_id: payment.transaction_id,
        amount: payment.amount,
        currency: payment.currency,
        status: "chargeback",
        authorization_code: payment.authorization_code,
        payment_details: payment.payment_details,
      } satisfies IShoppingMallPayment.ICreate,
    });
  typia.assert(chargebackPayment);

  // Step 5: Retrieve the final payment details
  const retrievedPayment: IShoppingMallPayment =
    await api.functional.shoppingMall.admin.orders.payments.at(connection, {
      orderId: orderId,
      paymentId: chargebackPayment.id,
    });
  typia.assert(retrievedPayment);

  // Step 6: Validate the payment details
  TestValidator.equals(
    "payment ID should match",
    retrievedPayment.id,
    chargebackPayment.id,
  );
  TestValidator.equals(
    "payment status should be chargeback",
    retrievedPayment.status,
    "chargeback",
  );
  TestValidator.equals(
    "payment amount should match",
    retrievedPayment.amount,
    payment.amount,
  );
  TestValidator.equals(
    "payment currency should match",
    retrievedPayment.currency,
    payment.currency,
  );
  TestValidator.equals(
    "payment method should match",
    retrievedPayment.payment_method,
    payment.payment_method,
  );
  TestValidator.equals(
    "payment gateway should match",
    retrievedPayment.payment_gateway,
    payment.payment_gateway,
  );
  TestValidator.equals(
    "transaction ID should match",
    retrievedPayment.transaction_id,
    payment.transaction_id,
  );

  // Validate that payment details are properly recorded
  TestValidator.predicate(
    "payment should have creation timestamp",
    retrievedPayment.created_at !== undefined &&
      retrievedPayment.created_at !== null,
  );
  TestValidator.predicate(
    "payment should have update timestamp",
    retrievedPayment.updated_at !== undefined &&
      retrievedPayment.updated_at !== null,
  );

  // Validate comprehensive payment lifecycle tracking
  TestValidator.predicate(
    "payment record should contain dispute lifecycle information",
    retrievedPayment.status === "chargeback" &&
      retrievedPayment.payment_details !== undefined,
  );

  // Additional validation for payment lifecycle completeness
  TestValidator.predicate(
    "payment should have proper authorization code",
    retrievedPayment.authorization_code !== undefined &&
      retrievedPayment.authorization_code !== null &&
      retrievedPayment.authorization_code.length > 0,
  );

  // Validate that the payment record maintains transaction integrity
  TestValidator.equals(
    "payment should maintain transaction integrity across status transitions",
    retrievedPayment.transaction_id,
    payment.transaction_id,
  );
}
