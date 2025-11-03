import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful member login using email address credentials.
 *
 * This test validates the dual credential support for member authentication,
 * specifically testing the ability to log in using email address instead of
 * username. The system supports flexible authentication where members can
 * provide either their username or email in the username_or_email field.
 *
 * Test workflow:
 *
 * 1. Register a new member account with username, email, and password
 * 2. Perform login using the email address (not username) as credential
 * 3. Validate successful authentication with JWT token issuance
 * 4. Verify returned member information matches registration data
 *
 * This ensures the email-based login path works correctly and provides the same
 * authentication experience as username-based login.
 */
export async function test_api_member_login_success_with_email(
  connection: api.IConnection,
) {
  // Generate test data for member registration
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = "SecurePass123!@#";
  const testUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const registrationBody = {
    username: testUsername,
    email: testEmail,
    password: testPassword,
    ip: "192.168.1.100",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  // Step 1: Register a new member account
  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationBody,
    });
  typia.assert(registeredMember);

  // Step 2: Login using email address (not username)
  const loginBody = {
    username_or_email: testEmail,
    password: testPassword,
    ip: "192.168.1.101",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ILogin;

  const loggedInMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInMember);

  // Step 3: Validate business logic - verify login response matches registration
  TestValidator.equals(
    "logged in member ID should match registered member",
    loggedInMember.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "logged in member username should match",
    loggedInMember.username,
    testUsername,
  );
  TestValidator.equals(
    "logged in member email should match",
    loggedInMember.email,
    testEmail,
  );
}
