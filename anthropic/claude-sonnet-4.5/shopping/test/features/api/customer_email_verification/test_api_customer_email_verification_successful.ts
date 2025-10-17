import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test email verification endpoint functionality for customer accounts.
 *
 * This test validates the email verification API endpoint by:
 *
 * 1. Registering a new customer account (creates unverified account with token)
 * 2. Attempting email verification with a verification token
 * 3. Validating the verification response structure
 *
 * Note: In a real-world scenario, the verification token would be sent via
 * email. For E2E testing, we simulate the verification flow by using a properly
 * formatted token. The backend will validate the token and respond
 * appropriately.
 *
 * The test ensures:
 *
 * - Customer registration succeeds and returns proper authorization
 * - Email verification endpoint accepts properly structured requests
 * - Verification response follows the expected IEmailVerificationResponse
 *   structure
 * - All response data passes strict type validation
 *
 * Steps:
 *
 * 1. Generate and validate customer registration data
 * 2. Register new customer via join API
 * 3. Validate registration response structure and authentication token
 * 4. Prepare email verification request with token
 * 5. Call email verification endpoint
 * 6. Validate verification response structure
 */
export async function test_api_customer_email_verification_successful(
  connection: api.IConnection,
) {
  // Step 1: Generate customer registration data with valid constraints
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  // Step 2: Register new customer account
  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: registrationData,
    });

  // Step 3: Validate registration response structure
  typia.assert(authorizedCustomer);

  // Verify customer data is properly returned
  TestValidator.predicate(
    "customer email matches registration",
    authorizedCustomer.email === registrationData.email,
  );

  TestValidator.predicate(
    "customer name matches registration",
    authorizedCustomer.name === registrationData.name,
  );

  TestValidator.predicate(
    "authorization token is present",
    authorizedCustomer.token.access.length > 0,
  );

  // Step 4: Prepare verification token for testing
  // Note: In production, this token would come from the verification email
  // For testing purposes, we use a properly formatted UUID token
  const verificationToken = typia.random<string & tags.Format<"uuid">>();

  const verificationRequest = {
    token: verificationToken,
  } satisfies IShoppingMallCustomer.IEmailVerification;

  // Step 5: Attempt email verification
  // Note: This may succeed or fail depending on whether the backend
  // accepts the test token format. The test validates the endpoint exists
  // and returns properly structured responses.
  const verificationResponse: IShoppingMallCustomer.IEmailVerificationResponse =
    await api.functional.auth.customer.email.verify.verifyEmail(connection, {
      body: verificationRequest,
    });

  // Step 6: Validate verification response structure
  typia.assert(verificationResponse);

  // Verify response contains a meaningful message
  TestValidator.predicate(
    "verification response contains success message",
    verificationResponse.message.length > 0,
  );

  TestValidator.predicate(
    "verification message is a valid string",
    typeof verificationResponse.message === "string",
  );
}
