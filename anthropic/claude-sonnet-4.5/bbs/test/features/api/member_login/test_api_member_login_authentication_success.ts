import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuth";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful member login authentication workflow.
 *
 * This test validates the complete authentication flow for a member:
 *
 * 1. Create a new member account through registration with valid credentials
 * 2. Authenticate using the login endpoint with valid credentials
 * 3. Validate login response contains proper JWT tokens and user information
 * 4. Verify authenticated member information matches registered account
 * 5. Confirm session is successfully established
 */
export async function test_api_member_login_authentication_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account through registration
  const registrationEmail = typia.random<string & tags.Format<"email">>();
  const registrationPassword = "SecurePass123!";
  const registrationUsername = RandomGenerator.alphaNumeric(12);

  const registrationData = {
    username: registrationUsername,
    email: registrationEmail,
    password: registrationPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });
  typia.assert(registeredMember);

  // Step 2: Authenticate using the login endpoint with registered credentials
  const loginData = {
    username_or_email: registrationUsername,
    password: registrationPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAuth.ILogin;

  const loginResult: IDiscussionBoardAuth.ILoginResult =
    await api.functional.discussionBoard.auth.login(connection, {
      body: loginData,
    });
  typia.assert(loginResult);

  // Step 3: Verify authenticated member information matches registered account
  TestValidator.equals(
    "user ID matches registration",
    loginResult.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "username matches registration",
    loginResult.username,
    registrationUsername,
  );
  TestValidator.equals(
    "email matches registration",
    loginResult.email,
    registrationEmail,
  );
  TestValidator.equals(
    "email_verified status matches",
    loginResult.email_verified,
    registeredMember.email_verified,
  );

  // Step 4: Verify role designation
  TestValidator.equals("role should be member", loginResult.role, "member");
}
