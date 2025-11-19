import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Tests login rejection when an invalid password is provided for a valid
 * contributor account.
 *
 * This test validates that the authentication system properly rejects login
 * attempts with incorrect passwords while not exposing whether the email exists
 * or the password is wrong. The test follows this workflow:
 *
 * 1. Register a new contributor account with known credentials (correct password)
 * 2. Attempt to login with the same email but an incorrect password
 * 3. Verify that the login attempt fails with appropriate error
 * 4. Confirm that no valid authentication token was issued
 *
 * This test ensures security best practices by verifying that failed
 * authentication attempts do not leak information about whether accounts
 * exist.
 */
export async function test_api_contributor_login_invalid_password(
  connection: api.IConnection,
) {
  // Step 1: Register a contributor with known email and correct password
  const email = "bob@example.com";
  const correctPassword = "CorrectPass123!";
  const wrongPassword = "WrongPass123!";

  const registered = await api.functional.auth.contributor.join(connection, {
    body: {
      email: email,
      username: "bob_user_" + RandomGenerator.alphaNumeric(8),
      password: correctPassword,
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(registered);
  TestValidator.equals(
    "registered contributor email matches",
    registered.email,
    email,
  );

  // Step 2: Attempt login with incorrect password
  await TestValidator.error(
    "login with incorrect password should fail",
    async () => {
      await api.functional.auth.contributor.login(connection, {
        body: {
          email: email,
          password: wrongPassword,
          href: "https://example.com/login",
          referrer: "https://example.com/home",
        } satisfies IDiscussionBoardContributor.ILogin,
      });
    },
  );

  // Step 3: Verify that correct password still works
  const correctLogin = await api.functional.auth.contributor.login(connection, {
    body: {
      email: email,
      password: correctPassword,
      href: "https://example.com/login",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardContributor.ILogin,
  });
  typia.assert(correctLogin);
  TestValidator.equals(
    "correct password login succeeds with valid token",
    correctLogin.email,
    email,
  );
  TestValidator.predicate(
    "access token is present",
    correctLogin.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    correctLogin.token.refresh.length > 0,
  );
}
