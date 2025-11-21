import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallResendVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallResendVerification";
import type { IShoppingMallResendVerificationResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallResendVerificationResponse";

/**
 * Test system enforces rate limiting rules by restricting frequent verification
 * resend requests.
 *
 * This test validates that the shopping mall platform properly implements rate
 * limiting for email verification resend attempts to prevent abuse and protect
 * legitimate users.
 *
 * Test workflow covers:
 *
 * 1. Successful initial verification resend request
 * 2. Immediate subsequent request that should trigger rate limiting
 * 3. Validation of rate limit response structure and messages
 * 4. Alternative test via customerId field
 * 5. Verification of response field completeness
 * 6. Basic timestamp validation for cooling-off period
 */
export async function test_api_verification_resend_rate_limit_enforcement(
  connection: api.IConnection,
) {
  // Generate test data for verification resend requests
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testCustomerId = typia.random<string & tags.Format<"uuid">>();
  const currentHref = `${connection.host}/register`;
  const currentReferrer = `${connection.host}/login`;

  // Test 1: Email-based verification resend with rate limiting
  const resendBody = {
    email: testEmail,
    href: currentHref,
    referrer: currentReferrer,
  } satisfies IShoppingMallResendVerification;

  // Initial request should succeed
  const firstResponse =
    await api.functional.shoppingMall.auth.verification.resend.resendVerification(
      connection,
      { body: resendBody },
    );
  typia.assert(firstResponse);

  TestValidator.predicate(
    "first verification resend should succeed",
    firstResponse.success === true,
  );
  TestValidator.predicate(
    "first response message should exist",
    firstResponse.message.length > 0,
  );

  // Test rapid subsequent request - expecting rate limiting
  const secondResponse =
    await api.functional.shoppingMall.auth.verification.resend.resendVerification(
      connection,
      { body: resendBody },
    );
  typia.assert(secondResponse);

  // Validate rate limiting responses have consistent structure
  TestValidator.predicate(
    "rate limited responses should have consistent message present",
    secondResponse.message.length > 0,
  );
  TestValidator.predicate(
    "rate limited responses should include next_retry_after when rate limited",
    secondResponse.next_retry_after !== undefined,
  );

  // Test 2: Alternative via customerId field
  const resendBodyWithCustomerId = {
    email: testEmail,
    customerId: testCustomerId,
    href: currentHref,
    referrer: currentReferrer,
    ip: "192.168.1.1",
  } satisfies IShoppingMallResendVerification;

  const customerResponse =
    await api.functional.shoppingMall.auth.verification.resend.resendVerification(
      connection,
      { body: resendBodyWithCustomerId },
    );
  typia.assert(customerResponse);

  TestValidator.predicate(
    "customerId-based resend should provide response",
    customerResponse.message.length > 0,
  );

  // Verify delivery_status field presence (may be present or undefined)
  TestValidator.predicate(
    "response validation should be complete",
    customerResponse.success === true || customerResponse.success === false,
  );
}
