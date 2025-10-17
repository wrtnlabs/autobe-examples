import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validate admin user login with an existing account.
 *
 * This test function performs:
 *
 * 1. Admin registration via join API to create a valid admin user.
 * 2. Login using the registered admin credentials.
 * 3. Verification that the login returns the JWT tokens and proper user data.
 * 4. Negative tests verifying errors raised on invalid login attempts.
 */
export async function test_api_admin_login_with_existing_account(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account
  const email = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const password = "SecureP@ssword123";
  const displayName = RandomGenerator.name();

  const joinBody = {
    email: email,
    password: password,
    displayName: displayName,
  } satisfies IDiscussionBoardAdmin.IJoin;

  const joinedAdmin = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert(joinedAdmin);

  TestValidator.equals(
    "joined admin email matches input",
    joinedAdmin.email,
    email,
  );

  // Step 2: Login with the registered credentials
  const loginBody = {
    email: email,
    password: password,
  } satisfies IDiscussionBoardAdmin.ILogin;

  const loggedInAdmin = await api.functional.auth.admin.login(connection, {
    body: loginBody,
  });
  typia.assert(loggedInAdmin);

  TestValidator.equals(
    "logged in admin email matches input",
    loggedInAdmin.email,
    email,
  );

  // Validate JWT token availability and expiration format
  TestValidator.predicate(
    "access token is a non-empty string",
    typeof loggedInAdmin.token.access === "string" &&
      loggedInAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is a non-empty string",
    typeof loggedInAdmin.token.refresh === "string" &&
      loggedInAdmin.token.refresh.length > 0,
  );
  // The timestamps are strings in ISO 8601 format, confirmed by typia.assert on type
  typia.assert<string & tags.Format<"date-time">>(
    loggedInAdmin.token.expired_at,
  );
  typia.assert<string & tags.Format<"date-time">>(
    loggedInAdmin.token.refreshable_until,
  );

  // Step 3: Negative test - login with invalid email
  await TestValidator.error(
    "login with invalid email should fail",
    async () => {
      const invalidEmailLogin = {
        email: `invalid_${email}`,
        password: password,
      } satisfies IDiscussionBoardAdmin.ILogin;
      await api.functional.auth.admin.login(connection, {
        body: invalidEmailLogin,
      });
    },
  );

  // Step 4: Negative test - login with invalid password
  await TestValidator.error(
    "login with invalid password should fail",
    async () => {
      const invalidPasswordLogin = {
        email: email,
        password: "wrongpassword",
      } satisfies IDiscussionBoardAdmin.ILogin;
      await api.functional.auth.admin.login(connection, {
        body: invalidPasswordLogin,
      });
    },
  );
}
