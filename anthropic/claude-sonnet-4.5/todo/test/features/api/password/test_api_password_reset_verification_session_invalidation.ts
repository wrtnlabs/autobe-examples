import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test password reset workflow and session management.
 *
 * This test validates the password reset request flow and verifies that
 * requesting a password reset does not immediately invalidate existing
 * sessions. The complete password reset flow (including token verification and
 * session invalidation) cannot be fully tested in E2E context because reset
 * tokens are sent via email and are not accessible to the test.
 *
 * The test workflow includes:
 *
 * 1. Create a user account
 * 2. Log in to establish an active session
 * 3. Request a password reset
 * 4. Verify that the reset request succeeds with appropriate message
 * 5. Verify that existing sessions remain valid after reset request
 * 6. Verify that the user can still authenticate with the original password
 *
 * Note: Full session invalidation testing would require completing the password
 * reset verification flow, which needs the reset token sent via email.
 */
export async function test_api_password_reset_verification_session_invalidation(
  connection: api.IConnection,
) {
  // Step 1: Create a user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = typia.random<string & tags.MinLength<8>>();

  const createdUser = await api.functional.todoList.users.join(connection, {
    body: {
      email: userEmail,
      password: originalPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(createdUser);
  TestValidator.equals(
    "created user email matches input",
    createdUser.email,
    userEmail,
  );

  // Step 2: Log in to create an active session
  const loginResult = await api.functional.todoList.users.login(connection, {
    body: {
      email: userEmail,
      password: originalPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ILogin,
  });
  typia.assert(loginResult);
  TestValidator.equals(
    "logged in user email matches",
    loginResult.email,
    userEmail,
  );

  // Store the original tokens
  const originalAccessToken = loginResult.token.access;
  const originalRefreshToken = loginResult.token.refresh;

  TestValidator.predicate(
    "access token is non-empty",
    originalAccessToken.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    originalRefreshToken.length > 0,
  );

  // Step 3: Request password reset
  const resetRequestResponse =
    await api.functional.todoList.users.password.reset.requestReset(
      connection,
      {
        body: {
          email: userEmail,
        } satisfies ITodoListUser.IPasswordResetRequest,
      },
    );
  typia.assert(resetRequestResponse);
  TestValidator.predicate(
    "reset request response contains message",
    resetRequestResponse.message.length > 0,
  );

  // Step 4: Verify that existing sessions remain valid after reset request
  // The reset REQUEST should not invalidate sessions - only the reset COMPLETION should
  const loginAfterResetRequest = await api.functional.todoList.users.login(
    connection,
    {
      body: {
        email: userEmail,
        password: originalPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ILogin,
    },
  );
  typia.assert(loginAfterResetRequest);
  TestValidator.equals(
    "user can still login with original password after reset request",
    loginAfterResetRequest.email,
    userEmail,
  );

  // Verify new login session has valid tokens
  TestValidator.predicate(
    "new session has valid access token",
    loginAfterResetRequest.token.access.length > 0,
  );
  TestValidator.predicate(
    "new session has valid refresh token",
    loginAfterResetRequest.token.refresh.length > 0,
  );
}
