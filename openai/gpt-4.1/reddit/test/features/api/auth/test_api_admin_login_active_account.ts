import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";

/**
 * Validate admin login process for new active accounts.
 *
 * This test verifies the admin authentication system: (1) registers a new admin
 * via the join endpoint, (2) logs in as that admin with the provided
 * credentials, and (3) validates that the login response contains valid access
 * and refresh tokens, as well as confirms the admin account is active. This
 * covers the core happy path and ensures token and status logic is correct.
 *
 * Steps:
 *
 * 1. Generate a random admin email and password
 * 2. Register a new admin account with these credentials using
 *    api.functional.auth.admin.join
 * 3. Extract the registered email and password
 * 4. Log in with the exact credentials using api.functional.auth.admin.login
 * 5. Assert that the login response contains a valid IAuthorizationToken
 *    (access/refresh tokens with expiration/refreshable fields)
 * 6. Assert that 'status' is 'active' in both registration and login responses
 * 7. Assert that returned email matches the registered one
 */
export async function test_api_admin_login_active_account(
  connection: api.IConnection,
) {
  // Step 1: Generate random email/password
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);

  // Step 2: Register new admin
  const joined = await api.functional.auth.admin.join(connection, {
    body: {
      email,
      password,
      // don't provide 'superuser', let it default to false
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(joined);

  // Step 3: Assert that the registered admin is active
  TestValidator.equals(
    "admin status is active after join",
    joined.status,
    "active",
  );
  TestValidator.equals("admin email matches after join", joined.email, email);
  typia.assert(joined.token);
  TestValidator.predicate(
    "access token is set after join",
    typeof joined.token.access === "string" && joined.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is set after join",
    typeof joined.token.refresh === "string" && joined.token.refresh.length > 0,
  );

  // Step 4: Login using same credentials
  const loggedIn = await api.functional.auth.admin.login(connection, {
    body: {
      email,
      password,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  typia.assert(loggedIn);

  // Step 5: Assert login response contains valid tokens and correct status
  TestValidator.equals(
    "admin email matches after login",
    loggedIn.email,
    email,
  );
  TestValidator.equals(
    "admin status is active after login",
    loggedIn.status,
    "active",
  );
  typia.assert(loggedIn.token);
  TestValidator.predicate(
    "access token is set after login",
    typeof loggedIn.token.access === "string" &&
      loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is set after login",
    typeof loggedIn.token.refresh === "string" &&
      loggedIn.token.refresh.length > 0,
  );
}
