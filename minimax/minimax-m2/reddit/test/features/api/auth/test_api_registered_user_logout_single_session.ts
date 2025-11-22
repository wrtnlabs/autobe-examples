import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test successful logout of a registered user with a single active session.
 *
 * This test validates the complete logout functionality for Reddit platform
 * registered users. It creates a new user account, establishes an authenticated
 * session, performs logout, and validates proper session termination with
 * confirmation response.
 *
 * The test ensures that:
 *
 * - User registration creates proper authenticated session
 * - Logout operation terminates the session successfully
 * - Logout confirmation contains accurate session metadata
 * - Session termination status is properly indicated
 *
 * Test Flow:
 *
 * 1. Create registered user account with join API
 * 2. Validate authentication response contains valid user data and tokens
 * 3. Perform logout operation to terminate session
 * 4. Validate logout confirmation response
 * 5. Verify logout_successful flag and session termination details
 */
export async function test_api_registered_user_logout_single_session(
  connection: api.IConnection,
) {
  // Generate unique user credentials for test
  const username = `testuser_${RandomGenerator.alphaNumeric(8)}`;
  const email = `${username}@test.com`;
  const password = "TestPassword123!";

  // Step 1: Create new registered user account and establish authenticated session
  const authorizedUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username,
        email,
        password,
        href: "https://reddit.com/test",
        referrer: "https://reddit.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });

  // Validate user registration response
  typia.assert(authorizedUser);
  TestValidator.equals(
    "user ID is valid UUID",
    authorizedUser.id,
    authorizedUser.id,
  );
  TestValidator.equals("username matches", authorizedUser.username, username);
  TestValidator.equals("email matches", authorizedUser.email, email);
  TestValidator.equals(
    "account status is active",
    authorizedUser.accountStatus,
    "active",
  );
  TestValidator.equals(
    "business status is pending verification",
    authorizedUser.businessStatus,
    "pending_verification",
  );
  TestValidator.equals(
    "email is not verified yet",
    authorizedUser.emailVerified,
    false,
  );
  TestValidator.predicate(
    "authentication token exists",
    !!authorizedUser.token,
  );
  TestValidator.equals(
    "initial karma score is zero",
    authorizedUser.karmaScore,
    0,
  );
  TestValidator.equals(
    "initial login count is zero",
    authorizedUser.loginCount,
    0,
  );
  TestValidator.equals(
    "failed login attempts is zero",
    authorizedUser.failedLoginAttempts,
    0,
  );

  // Step 2: Perform logout operation to terminate the session
  const logoutConfirmation: IRedditPlatformRegisteredUser.ILogoutConfirmation =
    await api.functional.auth.registeredUser.logout(connection, {
      body: {
        logout_from_all_devices: false,
      } satisfies IRedditPlatformRegisteredUser.ILogout,
    });

  // Validate logout confirmation response
  typia.assert(logoutConfirmation);
  TestValidator.equals(
    "logout successful flag is true",
    logoutConfirmation.logout_successful,
    true,
  );
  TestValidator.predicate(
    "terminated session ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      logoutConfirmation.terminated_session_id,
    ),
  );
  TestValidator.predicate(
    "logout timestamp is valid ISO date",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/i.test(
      logoutConfirmation.logout_timestamp,
    ),
  );
  TestValidator.predicate(
    "session duration is positive number",
    typeof logoutConfirmation.session_duration_minutes === "number" &&
      logoutConfirmation.session_duration_minutes! >= 0,
  );
  TestValidator.equals(
    "all devices logged out flag is false",
    logoutConfirmation.all_devices_logged_out,
    false,
  );
  TestValidator.predicate(
    "remaining active sessions is non-negative",
    typeof logoutConfirmation.remaining_active_sessions === "number" &&
      logoutConfirmation.remaining_active_sessions! >= 0,
  );
}
