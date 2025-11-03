import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test successful user login workflow for Todo application.
 *
 * This test validates that existing users can authenticate with correct email
 * and password credentials, ensuring proper JWT access and refresh token
 * generation. The test verifies login attempts are properly tracked for
 * security monitoring including failed login attempt counting and account
 * lockout protection.
 *
 * The authentication flow is tested by:
 *
 * 1. Creating a new user account for login testing
 * 2. Authenticating with valid email and password
 * 3. Validating JWT token response structure and expiration
 * 4. Verifying user authorization information is returned
 * 5. Checking security metrics are properly tracked
 * 6. Confirming authenticated session is established
 *
 * This ensures users can securely access their personal task lists and perform
 * protected todo operations with industry-standard authentication mechanisms
 * and token-based session management.
 */
export async function test_api_user_login_success(connection: api.IConnection) {
  // Generate random user credentials for testing
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphaNumeric(10);

  // Step 1: Create user account first to have valid credentials
  const joinRequest = {
    email: testEmail,
    password: testPassword,
  } satisfies ITodoUser.IJoin;

  const user = await api.functional.auth.user.join(connection, {
    body: joinRequest,
  });
  typia.assert(user);

  // Step 2: Authenticate with valid credentials
  const loginCredentials = {
    email: testEmail,
    password: testPassword,
    href: "https://todo.app/login",
    referrer: "https://todo.app/",
  } satisfies ITodoUser.ILogin;

  const authorizedUser = await api.functional.auth.user.login(connection, {
    body: loginCredentials,
  });
  typia.assert(authorizedUser);

  // Step 3: Validate login response data accuracy
  TestValidator.equals("same user ID on login", authorizedUser.id, user.id);
  TestValidator.equals("same email on login", authorizedUser.email, testEmail);
  TestValidator.equals(
    "failed attempts remain 0",
    authorizedUser.failed_login_attempts,
    0,
  );
  TestValidator.equals("MFA still disabled", authorizedUser.mfa_enabled, false);

  // Step 4: Validate JWT token structure
  TestValidator.predicate(
    "access token is non-empty string",
    authorizedUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    authorizedUser.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiration is future date",
    new Date(authorizedUser.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token valid longer than access",
    new Date(authorizedUser.token.refreshable_until) >
      new Date(authorizedUser.token.expired_at),
  );

  // Step 5: Validate timestamps are properly formatted
  TestValidator.predicate(
    "created_at is valid date string",
    typia.is<string & tags.Format<"date-time">>(authorizedUser.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid date string",
    typia.is<string & tags.Format<"date-time">>(authorizedUser.updated_at),
  );
  TestValidator.predicate(
    "expired_at is valid date string",
    typia.is<string & tags.Format<"date-time">>(
      authorizedUser.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is valid date string",
    typia.is<string & tags.Format<"date-time">>(
      authorizedUser.token.refreshable_until,
    ),
  );

  // Step 6: Validate user task count and account status
  TestValidator.predicate(
    "tasks count is non-negative integer",
    authorizedUser.tasks_count >= 0 &&
      Number.isInteger(authorizedUser.tasks_count),
  );
  TestValidator.predicate(
    "no account lockout on successful login",
    authorizedUser.locked_until === null ||
      authorizedUser.locked_until === undefined,
  );

  // Step 7: Verify same user data integrity
  TestValidator.equals(
    "same created timestamp",
    authorizedUser.created_at,
    user.created_at,
  );
  TestValidator.equals(
    "same updated timestamp",
    authorizedUser.updated_at,
    user.updated_at,
  );
}
