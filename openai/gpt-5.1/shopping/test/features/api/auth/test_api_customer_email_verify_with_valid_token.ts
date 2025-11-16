import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";

/**
 * Verify that a customer can complete email verification with a valid token and
 * receive an updated authorization envelope.
 *
 * Business flow:
 *
 * 1. Customer self-registers through /auth/customer/join using
 *    IShoppingMallCustomerAuth.IJoin.
 * 2. A verification token would normally be sent via email; in this test, we
 *    simulate a valid opaque token string, as token issuance is out-of-band.
 * 3. Call /auth/customer/email/verify with IShoppingMallCustomerAuth.IVerifyEmail
 *    containing the token.
 * 4. Ensure the response is a valid IShoppingMallCustomer.IAuthorized and that
 *    identity fields are consistent and marked as verified.
 * 5. Confirm that JWT token structure (IAuthorizationToken) is present.
 */
export async function test_api_customer_email_verify_with_valid_token(
  connection: api.IConnection,
) {
  // 1. Customer self-registration via /auth/customer/join
  const joinBody = {
    email: `customer+verify_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    // ip is optional and nullable; omit it to let backend infer from context
    href: "https://shop.example.com/register",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const joined = await api.functional.auth.customer.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(joined);

  // Sanity-check key identity fields from join response
  TestValidator.predicate(
    "joined customer should have a non-empty id string",
    () => typeof joined.id === "string" && joined.id.length > 0,
  );
  TestValidator.equals(
    "joined email should match input email",
    joined.email,
    joinBody.email,
  );

  // 2. Simulate obtaining a valid verification token
  //
  // The real system would store a token in shopping_mall_email_verification_tokens
  // and deliver it out-of-band (e.g., email). Since that behavior is not exposed
  // via SDK, we simulate a valid opaque token string here.
  const verificationToken = RandomGenerator.alphaNumeric(48);

  const verifyBody = {
    token: verificationToken,
  } satisfies IShoppingMallCustomerAuth.IVerifyEmail;

  // 3. Call email verification endpoint with the simulated token
  const verified = await api.functional.auth.customer.email.verify.verifyEmail(
    connection,
    {
      body: verifyBody,
    },
  );
  typia.assert<IShoppingMallCustomer.IAuthorized>(verified);

  // 4. Validate identity consistency and verification flag
  TestValidator.equals(
    "verified customer id should match joined customer id",
    verified.id,
    joined.id,
  );
  TestValidator.equals(
    "verified customer email should match joined email",
    verified.email,
    joined.email,
  );
  TestValidator.predicate(
    "customer should be marked as verified after email verification",
    () => verified.isVerified === true || !!verified.isVerified,
  );

  // 5. Validate nested customer summary and token structures via typia
  typia.assert<IAuthorizationToken>(verified.token);
  typia.assert<IShoppingMallCustomer.ISummary>(verified.customer);

  // Additional soft checks using TestValidator for readability
  TestValidator.predicate(
    "authorization token access field should be non-empty string",
    () =>
      typeof verified.token.access === "string" &&
      verified.token.access.length > 0,
  );
  TestValidator.predicate(
    "authorization token refresh field should be non-empty string",
    () =>
      typeof verified.token.refresh === "string" &&
      verified.token.refresh.length > 0,
  );
}
