import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test member login with case-insensitive email matching.
 *
 * This test validates that the authentication system properly handles email
 * addresses in a case-insensitive manner, which is the standard practice for
 * email-based authentication systems. The test workflow is:
 *
 * 1. Register a member with mixed-case email (e.g., "User@Example.Com")
 * 2. Login with lowercase email (e.g., "user@example.com")
 * 3. Login with uppercase email (e.g., "USER@EXAMPLE.COM")
 * 4. Login with original mixed-case email
 * 5. Verify all login attempts succeed with valid tokens
 */
export async function test_api_member_login_case_insensitive_email(
  connection: api.IConnection,
) {
  // Generate test data with mixed-case email
  const mixedCaseEmail = "TestUser@Example.Com";
  const password = "SecurePassword123!";
  const username = RandomGenerator.name();

  // Step 1: Register a new member with mixed-case email
  const registrationBody = {
    email: mixedCaseEmail,
    password: password,
    username: username,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationBody,
    });
  typia.assert(registeredMember);

  // Verify registration succeeded
  TestValidator.equals(
    "registered email matches input",
    registeredMember.email.toLowerCase(),
    mixedCaseEmail.toLowerCase(),
  );

  // Step 2: Login with lowercase email
  const lowercaseEmail = mixedCaseEmail.toLowerCase();
  const lowercaseLoginBody = {
    email: lowercaseEmail,
    password: password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ILogin;

  const lowercaseLogin: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: lowercaseLoginBody,
    });
  typia.assert(lowercaseLogin);

  TestValidator.equals(
    "lowercase email login returns correct member",
    lowercaseLogin.id,
    registeredMember.id,
  );
  TestValidator.predicate(
    "lowercase email login returns valid access token",
    lowercaseLogin.token.access.length > 0,
  );

  // Step 3: Login with uppercase email
  const uppercaseEmail = mixedCaseEmail.toUpperCase();
  const uppercaseLoginBody = {
    email: uppercaseEmail,
    password: password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ILogin;

  const uppercaseLogin: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: uppercaseLoginBody,
    });
  typia.assert(uppercaseLogin);

  TestValidator.equals(
    "uppercase email login returns correct member",
    uppercaseLogin.id,
    registeredMember.id,
  );
  TestValidator.predicate(
    "uppercase email login returns valid access token",
    uppercaseLogin.token.access.length > 0,
  );

  // Step 4: Login with original mixed-case email
  const mixedCaseLoginBody = {
    email: mixedCaseEmail,
    password: password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ILogin;

  const mixedCaseLogin: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: mixedCaseLoginBody,
    });
  typia.assert(mixedCaseLogin);

  TestValidator.equals(
    "mixed-case email login returns correct member",
    mixedCaseLogin.id,
    registeredMember.id,
  );
  TestValidator.predicate(
    "mixed-case email login returns valid access token",
    mixedCaseLogin.token.access.length > 0,
  );

  // Verify all logins return the same member
  TestValidator.equals(
    "all email variations return same member ID",
    lowercaseLogin.id,
    uppercaseLogin.id,
  );
  TestValidator.equals(
    "lowercase and mixed-case logins return same member",
    lowercaseLogin.id,
    mixedCaseLogin.id,
  );
}
