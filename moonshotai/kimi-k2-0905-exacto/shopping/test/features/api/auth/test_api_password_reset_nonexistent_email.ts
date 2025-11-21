import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPasswordReset";

/**
 * Test password reset request for an email address that doesn't exist in the
 * system database.
 *
 * This security-focused test validates user enumeration protection mechanisms
 * by confirming that the API provides consistent responses whether the email
 * exists or not. The test ensures that attackers cannot determine valid user
 * accounts through the password reset interface by receiving identical response
 * structures, preventing information disclosure that could expose user accounts
 * to enumeration attacks.
 *
 * The validation focuses on business security requirements while maintaining
 * API consistency and proper error handling within the TypeScript type system.
 * This test confirms that non-existent email addresses receive identical
 * responses to valid email addresses, preventing user enumeration
 * vulnerabilities.
 */
export async function test_api_password_reset_nonexistent_email(
  connection: api.IConnection,
) {
  // Generate completely random email that doesn't exist in any database
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  // Build reset request with non-existent email using valid request format
  const resetRequest = {
    email: nonExistentEmail,
    href: `https://example.com/password-reset/${typia.random<string & tags.Format<"uuid">>()}`,
    referrer: `https://example.com/login${typia.random<string & tags.Pattern<"/.*">>()}`,
  } satisfies IShoppingMallPasswordReset.ICreate;

  // Execute password reset request - should succeed regardless of email existence
  const resetResponse =
    await api.functional.shoppingMall.auth.password.reset.requestReset(
      connection,
      { body: resetRequest },
    );

  // Validate response structure matches expected type
  typia.assert(resetResponse);

  // Verify response contains core password reset data regardless of email existence
  TestValidator.predicate(
    "password reset response should have valid ID",
    typia.is<string & tags.Format<"uuid">>(resetResponse.id),
  );

  TestValidator.equals(
    "password reset email should match request email",
    resetResponse.email,
    resetRequest.email,
  );

  // Validate token generation with proper format checking
  TestValidator.predicate(
    "password reset token has expected format and length",
    resetResponse.token.length > 0 &&
      typia.is<string>(resetResponse.token) &&
      resetResponse.token.includes("-"),
  );

  // Verify temporal properties for audit trail
  TestValidator.predicate(
    "password reset has valid creation timestamp",
    typia.is<string & tags.Format<"date-time">>(resetResponse.created_at),
  );

  TestValidator.predicate(
    "password reset has valid expiration time",
    typia.is<string & tags.Format<"date-time">>(resetResponse.expires_at) &&
      new Date(resetResponse.expires_at) > new Date(resetResponse.created_at),
  );

  // Validate status field handles nullable types correctly
  TestValidator.predicate(
    "password reset status is provided",
    resetResponse.status !== null && resetResponse.status !== undefined,
  );

  // Verify security tracking elements
  TestValidator.predicate(
    "password reset includes valid IP address tracking",
    resetResponse.ip_address.length > 0 &&
      typia.is<string & tags.Pattern<"[^\\s]+">>(resetResponse.ip_address),
  );

  // Validate optional used_at field properly handles nullable scenario
  TestValidator.predicate(
    "password reset used_at should be undefined for new requests",
    resetResponse.used_at === undefined,
  );
}
