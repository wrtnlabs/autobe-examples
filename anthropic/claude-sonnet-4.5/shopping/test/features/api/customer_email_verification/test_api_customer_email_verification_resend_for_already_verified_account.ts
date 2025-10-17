import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test verification email resend functionality for customer accounts.
 *
 * This test validates the basic functionality of the verification email resend
 * endpoint. It registers a new customer account and tests that the resend
 * verification endpoint returns the expected generic success message.
 *
 * Note: The original scenario requested testing error handling for
 * already-verified accounts, but this is not implementable because:
 *
 * 1. No API exists to retrieve verification tokens for testing
 * 2. The resend API returns generic success messages (not errors) for security
 *
 * This revised test focuses on validating the implementable functionality:
 *
 * 1. Register a new customer account (creates unverified account)
 * 2. Request verification email resend
 * 3. Validate the system returns the generic success message
 *
 * Business logic validation:
 *
 * - Resend endpoint returns generic success message for security
 * - System accepts valid email addresses for resend requests
 * - Response follows expected structure
 */
export async function test_api_customer_email_verification_resend_for_already_verified_account(
  connection: api.IConnection,
) {
  // Step 1: Register a new customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.MinLength<8>>();
  const customerName = RandomGenerator.name();

  const registeredCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        name: customerName,
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(registeredCustomer);

  // Step 2: Request verification email resend for the unverified account
  const resendResponse: IShoppingMallCustomer.IResendVerificationResponse =
    await api.functional.auth.customer.email.verify.resend.resendVerification(
      connection,
      {
        body: {
          email: customerEmail,
        } satisfies IShoppingMallCustomer.IResendVerification,
      },
    );
  typia.assert(resendResponse);

  // Step 3: Validate the response contains the expected success message
  TestValidator.predicate(
    "resend response contains generic success message",
    resendResponse.message.length > 0,
  );
}
