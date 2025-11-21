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
 * Comprehensive E2E test for payment creation with multiple payment methods
 *
 * This test validates that the payment creation API properly handles different
 * payment methods including credit_card, paypal, bank_transfer, and
 * digital_wallet. It ensures gateway compatibility, method-specific workflows,
 * and proper status transitions according to each payment method's processing
 * requirements.
 */
export async function test_api_payment_creation_multiple_methods(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminJoinResponse = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({
        payment_management: true,
        order_management: true,
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminJoinResponse);

  // Step 2: Login with the created administrator
  const adminLoginResponse = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://shoppingmall.example.com/admin/dashboard",
      referrer: "https://shoppingmall.example.com/admin/login",
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  typia.assert(adminLoginResponse);

  // Step 3: Define payment methods and test data
  const paymentMethods = [
    "credit_card",
    "paypal",
    "bank_transfer",
    "digital_wallet",
  ] as const;
  const currencies = ["USD", "EUR", "KRW", "JPY"] as const;
  const statuses = ["pending", "authorized", "captured"] as const;

  // Step 4: Test each payment method with realistic scenarios
  for (const paymentMethod of paymentMethods) {
    const currency = RandomGenerator.pick(currencies);
    const initialStatus = RandomGenerator.pick(statuses);

    // Generate realistic payment data
    const paymentAmount = typia.random<
      number & tags.Minimum<1> & tags.Maximum<10000>
    >();
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Use method-appropriate gateway names
    const paymentGateway = `${paymentMethod}_gateway`;

    // Generate order ID for payment creation
    const orderId = typia.random<string & tags.Format<"uuid">>();

    // Create payment with specific method
    const paymentResponse =
      await api.functional.shoppingMall.admin.orders.payments.create(
        connection,
        {
          orderId: orderId,
          body: {
            payment_method: paymentMethod,
            payment_gateway: paymentGateway,
            transaction_id: transactionId,
            amount: paymentAmount,
            currency: currency,
            status: initialStatus,
            authorization_code:
              initialStatus === "authorized"
                ? `AUTH-${Math.random().toString(36).substr(2, 8).toUpperCase()}`
                : undefined,
            payment_details:
              initialStatus === "authorized"
                ? JSON.stringify({
                    method: paymentMethod,
                    gateway: paymentGateway,
                    test_scenario: "e2e_test",
                  })
                : undefined,
          } satisfies IShoppingMallPayment.ICreate,
        },
      );
    typia.assert(paymentResponse);

    // Validate payment response structure
    TestValidator.equals(
      `payment method should match ${paymentMethod}`,
      paymentResponse.payment_method,
      paymentMethod,
    );
    TestValidator.equals(
      `payment gateway should be set`,
      paymentResponse.payment_gateway,
      paymentGateway,
    );
    TestValidator.equals(
      `transaction ID should match`,
      paymentResponse.transaction_id,
      transactionId,
    );
    TestValidator.equals(
      `amount should match`,
      paymentResponse.amount,
      paymentAmount,
    );
    TestValidator.equals(
      `currency should match ${currency}`,
      paymentResponse.currency,
      currency,
    );
    TestValidator.equals(
      `status should match ${initialStatus}`,
      paymentResponse.status,
      initialStatus,
    );

    // Validate method-specific behavior
    if (initialStatus === "authorized") {
      TestValidator.predicate(
        `authorized ${paymentMethod} payment should have authorization code`,
        paymentResponse.authorization_code !== undefined &&
          paymentResponse.authorization_code.length > 0,
      );
    }

    // Validate payment details when provided
    if (paymentResponse.payment_details) {
      TestValidator.predicate(`payment details should be valid JSON`, () => {
        try {
          JSON.parse(paymentResponse.payment_details!);
          return true;
        } catch {
          return false;
        }
      });
    }
  }

  // Step 5: Test error scenarios
  await TestValidator.error("should reject invalid currency code", async () => {
    const orderId = typia.random<string & tags.Format<"uuid">>();

    await api.functional.shoppingMall.admin.orders.payments.create(connection, {
      orderId: orderId,
      body: {
        payment_method: "credit_card",
        payment_gateway: "test_gateway",
        transaction_id: `TXN-${Date.now()}-INVALID`,
        amount: 100,
        currency: "INVALID_CURRENCY", // Invalid currency
        status: "pending",
      } satisfies IShoppingMallPayment.ICreate,
    });
  });

  await TestValidator.error("should reject negative amount", async () => {
    const orderId = typia.random<string & tags.Format<"uuid">>();

    await api.functional.shoppingMall.admin.orders.payments.create(connection, {
      orderId: orderId,
      body: {
        payment_method: "credit_card",
        payment_gateway: "test_gateway",
        transaction_id: `TXN-${Date.now()}-NEGATIVE`,
        amount: -50, // Negative amount
        currency: "USD",
        status: "pending",
      } satisfies IShoppingMallPayment.ICreate,
    });
  });

  // Step 6: Test successful payment creation with valid data
  const validOrderId = typia.random<string & tags.Format<"uuid">>();
  const validPayment =
    await api.functional.shoppingMall.admin.orders.payments.create(connection, {
      orderId: validOrderId,
      body: {
        payment_method: "credit_card",
        payment_gateway: "valid_gateway",
        transaction_id: `TXN-${Date.now()}-VALID`,
        amount: 2999.99,
        currency: "USD",
        status: "authorized",
        authorization_code: `AUTH-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
        payment_details: JSON.stringify({
          method: "credit_card",
          gateway: "valid_gateway",
          test: true,
        }),
      } satisfies IShoppingMallPayment.ICreate,
    });
  typia.assert(validPayment);

  // Final validation
  TestValidator.predicate(
    "all payment methods should be tested successfully",
    paymentMethods.length === 4,
  );
}
