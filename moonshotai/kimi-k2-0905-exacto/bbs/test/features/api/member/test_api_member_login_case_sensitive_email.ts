import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";

/**
 * Test that member login respects email case sensitivity by creating account
 * and testing login variations. Validates the system correctly handles email
 * address case differences during authentication flow.
 *
 * Test Process:
 *
 * 1. Create member account with capitalized email format
 * 2. Test login with original email case (validates proper authentication)
 * 3. Test login with lowercase email case (confirms case insensitivity handling)
 * 4. Verify system correctly identifies member across email case variations
 */
export async function test_api_member_login_case_sensitive_email(
  connection: api.IConnection,
) {
  // Step 1: Create member with capitalized email to test case sensitivity
  const capitalizedEmail = "TestUser@Example.com";
  const username = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(12);

  const registrationData = {
    username: username,
    email: capitalizedEmail,
    password: password,
  } satisfies IEconomicDiscussionMember.ICreate;

  // Register new member
  const newMember = await api.functional.auth.member.join(connection, {
    body: registrationData,
  });
  typia.assert(newMember);

  TestValidator.equals(
    "registered member email matches",
    newMember.member.email,
    capitalizedEmail,
  );
  TestValidator.equals(
    "registered member username matches",
    newMember.member.username,
    username,
  );

  // Step 2: Test login with original capitalized email case
  // Note: Using the same password that was registered (would need proper hashing in real implementation)
  const originalCaseLogin = {
    email: capitalizedEmail,
    password_hash: registrationData.password, // Note: In real implementation, this would be a hash
  } satisfies IEconomicDiscussionMember.ILogin;

  const originalAuth = await api.functional.auth.member.login(connection, {
    body: originalCaseLogin,
  });
  typia.assert(originalAuth);

  TestValidator.equals(
    "original case login successful",
    originalAuth.member.id,
    newMember.member.id,
  );
  TestValidator.equals(
    "original case email preserved",
    originalAuth.member.email,
    capitalizedEmail,
  );
  TestValidator.predicate(
    "original case has valid token",
    originalAuth.access_token.length > 0,
  );
  TestValidator.predicate(
    "original case has valid expiration",
    originalAuth.expires_in > 0,
  );

  // Step 3: Test login with lowercase email case
  const lowercaseEmail = capitalizedEmail.toLowerCase();
  const lowercaseLogin = {
    email: lowercaseEmail,
    password_hash: registrationData.password, // Note: Same password hash placeholder
  } satisfies IEconomicDiscussionMember.ILogin;

  const lowercaseAuth = await api.functional.auth.member.login(connection, {
    body: lowercaseLogin,
  });
  typia.assert(lowercaseAuth);

  TestValidator.equals(
    "lowercase case login successful",
    lowercaseAuth.member.id,
    newMember.member.id,
  );
  TestValidator.equals(
    "lowercase case email shows original",
    lowercaseAuth.member.email,
    capitalizedEmail,
  );
  TestValidator.predicate(
    "lowercase case token valid",
    lowercaseAuth.token.access.length > 0,
  );

  // Step 4: Validate that both variations authenticate the same member
  TestValidator.equals(
    "both case variations authenticate same member ID",
    originalAuth.member.id,
    lowercaseAuth.member.id,
  );

  // Step 5: Verify email case normalization in system
  TestValidator.equals(
    "system shows original email format in responses",
    originalAuth.member.email === capitalizedEmail &&
      lowercaseAuth.member.email === capitalizedEmail,
    true,
  );
}
