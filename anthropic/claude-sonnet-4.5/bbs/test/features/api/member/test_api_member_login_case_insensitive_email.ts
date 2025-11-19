import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that login performs case-insensitive email matching.
 *
 * This test validates that the authentication system correctly handles email
 * addresses regardless of capitalization, preventing login failures due to case
 * differences. The test registers a member with a mixed-case email and then
 * attempts login with various capitalization patterns.
 *
 * Steps:
 *
 * 1. Register a new member with mixed-case email (e.g., TestUser@Example.COM)
 * 2. Login with all lowercase email (testuser@example.com)
 * 3. Login with all uppercase email (TESTUSER@EXAMPLE.COM)
 * 4. Login with different mixed-case email (tEsTuSeR@eXaMpLe.CoM)
 * 5. Verify all login attempts succeed with valid tokens
 * 6. Confirm member ID consistency across all login attempts
 */
export async function test_api_member_login_case_insensitive_email(
  connection: api.IConnection,
) {
  // Step 1: Register a new member with mixed-case email
  const originalEmail = "TestUser@Example.COM";
  const password = "SecurePass123!";
  const username = RandomGenerator.alphaNumeric(12);

  const registrationBody = {
    email: originalEmail,
    password: password,
    username: username,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    href: "https://test.example.com/register",
    referrer: "https://test.example.com/home",
  } satisfies IDiscussionBoardMember.ICreate;

  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationBody,
    });

  typia.assert(registeredMember);
  TestValidator.equals(
    "registered email matches",
    registeredMember.email,
    originalEmail,
  );

  // Step 2: Login with all lowercase email
  const lowercaseEmail = originalEmail.toLowerCase();

  const loginLowerBody = {
    email: lowercaseEmail,
    password: password,
    href: "https://test.example.com/login",
    referrer: "https://test.example.com/home",
  } satisfies IDiscussionBoardMember.ILogin;

  const loginLowerResult: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: loginLowerBody,
    });

  typia.assert(loginLowerResult);
  TestValidator.equals(
    "lowercase login member ID matches",
    loginLowerResult.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "lowercase login username matches",
    loginLowerResult.username,
    registeredMember.username,
  );

  // Step 3: Login with all uppercase email
  const uppercaseEmail = originalEmail.toUpperCase();

  const loginUpperBody = {
    email: uppercaseEmail,
    password: password,
    href: "https://test.example.com/login",
    referrer: "https://test.example.com/home",
  } satisfies IDiscussionBoardMember.ILogin;

  const loginUpperResult: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: loginUpperBody,
    });

  typia.assert(loginUpperResult);
  TestValidator.equals(
    "uppercase login member ID matches",
    loginUpperResult.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "uppercase login username matches",
    loginUpperResult.username,
    registeredMember.username,
  );

  // Step 4: Login with different mixed-case email
  const mixedCaseEmail = "tEsTuSeR@eXaMpLe.CoM";

  const loginMixedBody = {
    email: mixedCaseEmail,
    password: password,
    href: "https://test.example.com/login",
    referrer: "https://test.example.com/home",
  } satisfies IDiscussionBoardMember.ILogin;

  const loginMixedResult: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: loginMixedBody,
    });

  typia.assert(loginMixedResult);
  TestValidator.equals(
    "mixed-case login member ID matches",
    loginMixedResult.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "mixed-case login username matches",
    loginMixedResult.username,
    registeredMember.username,
  );

  // Step 5: Verify all tokens are valid (non-empty access tokens)
  TestValidator.predicate(
    "lowercase login has valid access token",
    loginLowerResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "uppercase login has valid access token",
    loginUpperResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "mixed-case login has valid access token",
    loginMixedResult.token.access.length > 0,
  );
}
