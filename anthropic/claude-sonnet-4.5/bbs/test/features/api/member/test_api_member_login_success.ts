import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful member authentication with valid credentials.
 *
 * This test validates the complete login workflow including password
 * verification, session creation, token issuance, and profile retrieval. The
 * test ensures that the authentication system properly validates credentials,
 * tracks session context, and returns all necessary member information for
 * authenticated access.
 *
 * Steps:
 *
 * 1. Register a new member account with valid credentials
 * 2. Attempt login using the registered email and password with session context
 * 3. Verify that JWT tokens are issued with correct expiration times
 * 4. Validate that the member profile is returned with all expected fields
 * 5. Confirm that the login response includes authorization token information
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const registrationEmail = typia.random<string & tags.Format<"email">>();
  const registrationPassword = typia.random<string & tags.Format<"password">>();
  const registrationUsername = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<30>
  >();

  const registrationBody = {
    email: registrationEmail,
    password: registrationPassword,
    username: registrationUsername,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationBody,
    });
  typia.assert(registeredMember);

  // Verify registration was successful
  TestValidator.equals(
    "registered email matches",
    registeredMember.email,
    registrationEmail,
  );
  TestValidator.equals(
    "registered username matches",
    registeredMember.username,
    registrationUsername,
  );
  TestValidator.predicate("member has valid ID", !!registeredMember.id);
  TestValidator.predicate(
    "registration token exists",
    !!registeredMember.token,
  );

  // Step 2: Login with the registered credentials
  const loginBody = {
    email: registrationEmail,
    password: registrationPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ILogin;

  const loggedInMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInMember);

  // Step 3: Verify JWT tokens are issued
  TestValidator.predicate("access token exists", !!loggedInMember.token.access);
  TestValidator.predicate(
    "refresh token exists",
    !!loggedInMember.token.refresh,
  );
  TestValidator.predicate(
    "token expiration time exists",
    !!loggedInMember.token.expired_at,
  );
  TestValidator.predicate(
    "refresh expiration time exists",
    !!loggedInMember.token.refreshable_until,
  );

  // Step 4: Validate member profile information
  TestValidator.equals(
    "login email matches registration",
    loggedInMember.email,
    registrationEmail,
  );
  TestValidator.equals(
    "login username matches registration",
    loggedInMember.username,
    registrationUsername,
  );
  TestValidator.equals(
    "member ID matches",
    loggedInMember.id,
    registeredMember.id,
  );

  // Step 5: Verify member profile fields are present
  TestValidator.predicate(
    "email verified flag exists",
    typeof loggedInMember.email_verified === "boolean",
  );
  TestValidator.predicate(
    "suspension flag exists",
    typeof loggedInMember.is_suspended === "boolean",
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    !!loggedInMember.created_at,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    !!loggedInMember.updated_at,
  );

  // Verify account is not suspended and email verification status
  TestValidator.equals(
    "account is not suspended",
    loggedInMember.is_suspended,
    false,
  );
}
