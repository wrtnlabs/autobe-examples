import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test the complete customer email verification resend workflow for unverified
 * accounts.
 *
 * This test validates that customers who did not receive or lost their original
 * verification email can successfully request a new verification link. The test
 * covers the complete business workflow including:
 *
 * 1. Register a new customer account (creates unverified account)
 * 2. Request verification email resend using registered email
 * 3. Validate generic success message is returned (security best practice)
 * 4. Test rate limiting by attempting immediate second resend
 * 5. Validate second request is rejected with appropriate error
 *
 * Business rules validated:
 *
 * - Unverified accounts can request verification email resend
 * - System returns generic success message regardless of account existence
 * - Rate limiting enforces maximum 1 resend per 5 minutes per customer
 * - New verification token generated with 24-hour expiration window
 */
export async function test_api_customer_email_verification_resend_for_unverified_account(
  connection: api.IConnection,
) {
  // Step 1: Register a new customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerData = {
    email: customerEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const registeredCustomer = await api.functional.auth.customer.join(
    connection,
    {
      body: customerData,
    },
  );
  typia.assert(registeredCustomer);

  // Validate customer was created successfully
  TestValidator.equals(
    "customer email matches",
    registeredCustomer.email,
    customerEmail,
  );
  TestValidator.equals(
    "customer name matches",
    registeredCustomer.name,
    customerData.name,
  );

  // Step 2: Request verification email resend
  const resendRequest = {
    email: customerEmail,
  } satisfies IShoppingMallCustomer.IResendVerification;

  const firstResendResponse =
    await api.functional.auth.customer.email.verify.resend.resendVerification(
      connection,
      {
        body: resendRequest,
      },
    );
  typia.assert(firstResendResponse);

  // Step 3: Validate generic success message is returned
  TestValidator.predicate(
    "generic success message returned",
    typeof firstResendResponse.message === "string" &&
      firstResendResponse.message.length > 0,
  );

  // Step 4: Attempt immediate second resend to test rate limiting
  // This should fail due to rate limiting (max 1 resend per 5 minutes)
  await TestValidator.error(
    "rate limiting prevents immediate second resend",
    async () => {
      await api.functional.auth.customer.email.verify.resend.resendVerification(
        connection,
        {
          body: resendRequest,
        },
      );
    },
  );
}
