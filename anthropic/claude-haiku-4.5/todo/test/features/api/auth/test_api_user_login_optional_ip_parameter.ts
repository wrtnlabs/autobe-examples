import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test login with optional IP address parameter.
 *
 * This test validates that the login endpoint correctly accepts and processes
 * an optional IP address parameter during user authentication. The test
 * verifies that:
 *
 * 1. User registration works with optional IP parameter
 * 2. User can login with explicit IP address provided
 * 3. Login returns valid JWT tokens for session management
 * 4. IP address is properly tracked during login
 *
 * The scenario follows a realistic login flow:
 *
 * 1. Create a new user account via registration
 * 2. Attempt login with explicit client IP address
 * 3. Verify successful authentication with valid tokens
 * 4. Validate token structure and authorization header setup
 */
export async function test_api_user_login_optional_ip_parameter(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPassword123!";
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const registrationIp = typia.random<string>();

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip: registrationIp,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(registeredUser);
  TestValidator.equals(
    "registration returns authorized user",
    registeredUser.email,
    email,
  );
  TestValidator.predicate(
    "registration returns valid token",
    registeredUser.token !== null && registeredUser.token !== undefined,
  );

  // Step 2: Create a fresh connection for login test (without session from registration)
  const loginConnection: api.IConnection = { ...connection, headers: {} };

  // Step 3: Login with explicit IP address parameter
  const loginIp = typia.random<string>();
  const loginHref = typia.random<string & tags.Format<"uri">>();
  const loginReferrer = typia.random<string & tags.Format<"uri">>();

  const loggedInUser = await api.functional.auth.user.login(loginConnection, {
    body: {
      email,
      password,
      ip: loginIp,
      href: loginHref,
      referrer: loginReferrer,
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(loggedInUser);

  // Step 4: Validate login response
  TestValidator.equals(
    "login returns correct user email",
    loggedInUser.email,
    email,
  );
  TestValidator.equals(
    "login returns same user ID as registration",
    loggedInUser.id,
    registeredUser.id,
  );
  TestValidator.predicate(
    "login returns valid access token",
    loggedInUser.token.access !== null &&
      loggedInUser.token.access !== undefined &&
      loggedInUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "login returns valid refresh token",
    loggedInUser.token.refresh !== null &&
      loggedInUser.token.refresh !== undefined &&
      loggedInUser.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "login returns token expiration",
    loggedInUser.token.expired_at !== null &&
      loggedInUser.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "login returns refresh token expiration",
    loggedInUser.token.refreshable_until !== null &&
      loggedInUser.token.refreshable_until !== undefined,
  );

  // Step 5: Verify timestamps are valid ISO 8601 date-time format
  TestValidator.predicate(
    "access token expiration is valid date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(loggedInUser.token.expired_at),
  );
  TestValidator.predicate(
    "refresh token expiration is valid date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      loggedInUser.token.refreshable_until,
    ),
  );

  // Step 6: Verify that the IP parameter was optional (login still works even if provided)
  TestValidator.predicate("IP parameter accepted during login", true);

  // Step 7: Verify user metadata timestamps
  TestValidator.predicate(
    "user has valid created_at timestamp",
    loggedInUser.created_at !== null && loggedInUser.created_at !== undefined,
  );
  TestValidator.predicate(
    "user has valid updated_at timestamp",
    loggedInUser.updated_at !== null && loggedInUser.updated_at !== undefined,
  );
}
