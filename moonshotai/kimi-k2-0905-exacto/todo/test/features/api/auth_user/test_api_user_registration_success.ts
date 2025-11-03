import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test successful user registration workflow. Validates that new users can
 * create accounts with valid email and password, receives authentication tokens
 * upon successful registration, and account security fields are properly
 * initialized with default values (mfa_enabled=false, failed_login_attempts=0).
 * Also tests email uniqueness validation and password hashing security
 * measures.
 */
export async function test_api_user_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Generate random valid user registration data
  const testEmail = typia.random<string & tags.Format<"email">>();
  const registrationData = {
    email: testEmail,
    password: "StrongP@ssw0rd123",
  } satisfies ITodoUser.IJoin;

  // Step 2: Create new user account
  const createdUser = await api.functional.auth.user.join(connection, {
    body: registrationData,
  });

  // Step 3: Validate response structure and token
  typia.assert(createdUser);

  // Step 4: Verify user authentication data with correct parameter order (actual first, expected second)
  TestValidator.equals(
    "email matches registration email",
    createdUser.email,
    testEmail,
  );
  TestValidator.equals(
    "failed login attempts initialized to 0",
    createdUser.failed_login_attempts,
    0,
  );
  TestValidator.equals(
    "MFA disabled by default",
    createdUser.mfa_enabled,
    false,
  );
  TestValidator.equals("locked_until is null", createdUser.locked_until, null);
  TestValidator.equals(
    "tasks_count is 0 for new user",
    createdUser.tasks_count,
    0,
  );

  // Step 5: Verify token structure has valid data
  TestValidator.equals(
    "access token exists and is non-empty",
    createdUser.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token exists and is non-empty",
    createdUser.token.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "token expires date is valid",
    createdUser.token.expired_at.length > 0,
    true,
  );
  TestValidator.equals(
    "refreshable_until date is valid",
    createdUser.token.refreshable_until.length > 0,
    true,
  );

  // Step 6: Test email uniqueness validation - duplicate email should fail
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: registrationData,
      });
    },
  );
}
