import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test the password reset request workflow for a customer account.
 *
 * This test validates the password reset request process including:
 *
 * 1. Customer account creation through registration
 * 2. Password reset token generation request via email
 * 3. Verification that the reset request returns appropriate success message
 *
 * Note: Complete password reset testing (token validation and password update)
 * cannot be automated without access to the email system to retrieve the actual
 * reset token. This test focuses on the request phase which is fully testable
 * through the API.
 */
export async function test_api_customer_password_reset_completion_with_valid_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = "SecurePass123!";
  const customerName = RandomGenerator.name();
  const customerPhone = RandomGenerator.mobile();

  const registrationData = {
    email: customerEmail,
    password: originalPassword,
    name: customerName,
    phone: customerPhone,
  } satisfies IShoppingMallCustomer.ICreate;

  const registeredCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: registrationData,
    });

  typia.assert(registeredCustomer);
  TestValidator.equals(
    "customer email matches",
    registeredCustomer.email,
    customerEmail,
  );
  TestValidator.equals(
    "customer name matches",
    registeredCustomer.name,
    customerName,
  );

  // Step 2: Request password reset to generate reset token
  const resetRequestData = {
    email: customerEmail,
  } satisfies IShoppingMallCustomer.IPasswordResetRequest;

  const resetRequestResponse: IShoppingMallCustomer.IPasswordResetRequestResponse =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      {
        body: resetRequestData,
      },
    );

  typia.assert(resetRequestResponse);
  TestValidator.predicate(
    "reset request returns success message",
    resetRequestResponse.message.length > 0,
  );
}
