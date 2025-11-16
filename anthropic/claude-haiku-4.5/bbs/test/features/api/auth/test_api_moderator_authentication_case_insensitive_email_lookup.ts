import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Validates case-insensitive email and username authentication for moderators.
 *
 * Tests that moderator authentication accepts login credentials with various
 * case combinations for both email and username fields. This ensures the system
 * provides a user-friendly login experience where case sensitivity doesn't
 * prevent successful authentication.
 *
 * Test workflow:
 *
 * 1. Attempt login with email in lowercase
 * 2. Verify successful authentication with valid token response
 * 3. Attempt login with username in lowercase
 * 4. Verify successful authentication
 * 5. Attempt login with username in mixed case
 * 6. Verify token and moderator information in response
 */
export async function test_api_moderator_authentication_case_insensitive_email_lookup(
  connection: api.IConnection,
) {
  // Generate valid moderator credentials with email format
  const baseEmail = typia.random<string & tags.Format<"email">>();
  const baseUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const password = RandomGenerator.alphaNumeric(12);

  // Test 1: Login with lowercase email variant
  const lowercaseEmailLogin = {
    email: baseEmail.toLowerCase(),
    password: password,
    ip: "192.168.1.1",
    href: "https://example.com/login",
    referrer: "https://example.com",
  } satisfies IDiscussionBoardModerator.ILogin;

  const authFromLowercaseEmail: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: lowercaseEmailLogin,
    });
  typia.assert(authFromLowercaseEmail);

  TestValidator.predicate(
    "authentication with lowercase email succeeds",
    authFromLowercaseEmail.token.access.length > 0,
  );

  // Test 2: Login with uppercase email variant
  const uppercaseEmailLogin = {
    email: baseEmail.toUpperCase(),
    password: password,
    ip: "192.168.1.1",
    href: "https://example.com/login",
    referrer: "https://example.com",
  } satisfies IDiscussionBoardModerator.ILogin;

  const authFromUppercaseEmail: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: uppercaseEmailLogin,
    });
  typia.assert(authFromUppercaseEmail);

  TestValidator.predicate(
    "authentication with uppercase email succeeds",
    authFromUppercaseEmail.token.refresh.length > 0,
  );

  // Test 3: Login with lowercase username variant
  const lowercaseUsernameLogin = {
    username: baseUsername.toLowerCase(),
    password: password,
    ip: "192.168.1.1",
    href: "https://example.com/login",
    referrer: "https://example.com",
  } satisfies IDiscussionBoardModerator.ILogin;

  const authFromLowercaseUsername: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: lowercaseUsernameLogin,
    });
  typia.assert(authFromLowercaseUsername);

  TestValidator.predicate(
    "authentication with lowercase username succeeds",
    authFromLowercaseUsername.moderator !== undefined,
  );

  // Test 4: Login with uppercase username variant
  const uppercaseUsernameLogin = {
    username: baseUsername.toUpperCase(),
    password: password,
    ip: "192.168.1.1",
    href: "https://example.com/login",
    referrer: "https://example.com",
  } satisfies IDiscussionBoardModerator.ILogin;

  const authFromUppercaseUsername: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: uppercaseUsernameLogin,
    });
  typia.assert(authFromUppercaseUsername);

  // Validate moderator information is present in response
  TestValidator.equals(
    "authentication response includes moderator display name",
    typeof authFromUppercaseUsername.moderator.display_name,
    "string",
  );

  // Verify moderator account is active
  TestValidator.predicate(
    "authenticated moderator has active account status",
    authFromUppercaseUsername.moderator.account_status === "active",
  );

  // Verify token structure is complete
  TestValidator.predicate(
    "access token is present in response",
    authFromUppercaseUsername.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is present in response",
    authFromUppercaseUsername.token.refresh.length > 0,
  );
}
