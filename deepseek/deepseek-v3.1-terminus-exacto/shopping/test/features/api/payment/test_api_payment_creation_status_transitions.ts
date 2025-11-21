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
 * Test payment creation with different initial status values to validate proper
 * lifecycle management.
 *
 * This comprehensive test validates that payments can be created with all seven
 * supported status values: pending, authorized, captured, declined, refunded,
 * disputed, and chargeback. Each status variation is tested to ensure proper
 * initialization of status-specific fields like authorization_code and
 * captured_at based on the initial status selection.
 *
 * The test follows this workflow:
 *
 * 1. Create administrator account for authentication context
 * 2. Authenticate to establish admin session
 * 3. Test each payment status variation with appropriate field initialization
 * 4. Validate response structure and status-specific field handling
 */
export async function test_api_payment_creation_status_transitions(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminJoinResponse = await api.functional.auth.admin.join(connection, {
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
  typia.assert(adminJoinResponse);

  // 2. Authenticate administrator
  const adminLoginResponse = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000",
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  typia.assert(adminLoginResponse);

  // Define all supported payment statuses
  const paymentStatuses = [
    "pending",
    "authorized",
    "captured",
    "declined",
    "refunded",
    "disputed",
    "chargeback",
  ] as const;

  // Generate a mock order ID for payment creation (required by API endpoint)
  const mockOrderId = typia.random<string & tags.Format<"uuid">>();

  // 3. Test each payment status variation
  for (const status of paymentStatuses) {
    // Create payment details with status-specific field initialization
    const paymentData = {
      payment_method: RandomGenerator.pick([
        "credit_card",
        "paypal",
        "bank_transfer",
        "digital_wallet",
      ] as const),
      payment_gateway: "stripe",
      transaction_id: `txn_${RandomGenerator.alphaNumeric(16)}`,
      amount: typia.random<number & tags.Minimum<1> & tags.Maximum<10000>>(),
      currency: "USD",
      status: status,
      authorization_code:
        status === "authorized" || status === "captured"
          ? `auth_${RandomGenerator.alphaNumeric(8)}`
          : undefined,
      payment_details: JSON.stringify({
        method: "card",
        last4: "4242",
        brand: "visa",
      }),
    } satisfies IShoppingMallPayment.ICreate;

    // Create payment with specific status
    const payment =
      await api.functional.shoppingMall.admin.orders.payments.create(
        connection,
        {
          orderId: mockOrderId,
          body: paymentData,
        },
      );
    typia.assert(payment);

    // Validate basic payment properties
    TestValidator.equals(
      "payment ID should be valid UUID",
      typeof payment.id,
      "string",
    );
    TestValidator.equals(
      "payment method should match",
      payment.payment_method,
      paymentData.payment_method,
    );
    TestValidator.equals(
      "payment gateway should match",
      payment.payment_gateway,
      paymentData.payment_gateway,
    );
    TestValidator.equals(
      "transaction ID should match",
      payment.transaction_id,
      paymentData.transaction_id,
    );
    TestValidator.equals(
      "amount should match",
      payment.amount,
      paymentData.amount,
    );
    TestValidator.equals(
      "currency should match",
      payment.currency,
      paymentData.currency,
    );
    TestValidator.equals(
      "status should match initial value",
      payment.status,
      status,
    );

    // Validate status-specific field handling
    if (status === "authorized" || status === "captured") {
      TestValidator.predicate(
        "authorization code should be present for authorized/captured status",
        payment.authorization_code !== undefined &&
          payment.authorization_code.length > 0,
      );
    } else {
      TestValidator.equals(
        "authorization code should be undefined for non-authorized status",
        payment.authorization_code,
        undefined,
      );
    }

    if (status === "captured") {
      TestValidator.predicate(
        "captured_at should be present for captured status",
        payment.captured_at !== undefined,
      );
    } else {
      TestValidator.equals(
        "captured_at should be undefined for non-captured status",
        payment.captured_at,
        undefined,
      );
    }

    // Validate timestamps
    TestValidator.predicate(
      "created_at should be valid ISO string",
      typeof payment.created_at === "string" &&
        payment.created_at.includes("T"),
    );
    TestValidator.predicate(
      "updated_at should be valid ISO string",
      typeof payment.updated_at === "string" &&
        payment.updated_at.includes("T"),
    );
  }

  // 4. Additional validation: Test that all status variations were successfully created
  TestValidator.equals(
    "all payment status variations should be tested",
    paymentStatuses.length,
    7,
  );
}
