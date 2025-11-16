import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful member login workflow for an existing account.
 *
 * This test validates the complete authentication flow from registration to
 * login. First, it registers a new member with specific credentials, then
 * authenticates using those same credentials to verify the login functionality
 * works correctly.
 *
 * The test ensures that:
 *
 * 1. A new member can be registered successfully
 * 2. The registered member can log in with correct credentials
 * 3. Login response includes complete member information
 * 4. JWT tokens are properly generated and returned
 * 5. Member data returned matches registration data
 *
 * This validates the end-to-end authentication workflow including credential
 * verification, token generation, and session management.
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account to obtain valid credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = "testPassword123!";
  const username = RandomGenerator.name();
  const href = "https://example.com/register";
  const referrer = "https://example.com/home";

  const registrationData = {
    email,
    password,
    username,
    href,
    referrer,
  } satisfies IDiscussionBoardMember.ICreate;

  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });

  typia.assert(registeredMember);

  // Step 2: Authenticate using the registered credentials
  const loginData = {
    email,
    password,
    href: "https://example.com/login",
    referrer: "https://example.com/home",
  } satisfies IDiscussionBoardMember.ILogin;

  const loginResponse: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: loginData,
    });

  typia.assert(loginResponse);

  // Step 3: Validate login response contains expected member information
  TestValidator.equals(
    "logged in member email matches registration email",
    loginResponse.email,
    email,
  );

  TestValidator.equals(
    "logged in member username matches registration username",
    loginResponse.username,
    username,
  );
}
