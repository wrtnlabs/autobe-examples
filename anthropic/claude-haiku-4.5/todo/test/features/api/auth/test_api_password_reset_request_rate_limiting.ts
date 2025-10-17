import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuth";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";

/**
 * Test rate limiting enforcement on password reset requests to prevent abuse.
 *
 * User submits password reset request for same email address 3 times within
 * 15-minute window (maximum allowed). Fourth request within 15 minutes triggers
 * rate limiting, system returns HTTP 429 Too Many Requests with message
 * indicating rate limit exceeded and suggesting retry after wait period. Tests
 * that rate limiting prevents password reset endpoint abuse and brute force
 * attacks against email enumeration.
 *
 * Workflow:
 *
 * 1. Register a new user account
 * 2. Submit password reset request 1 for the registered email (should succeed)
 * 3. Submit password reset request 2 for the same email (should succeed)
 * 4. Submit password reset request 3 for the same email (should succeed)
 * 5. Submit password reset request 4 for the same email within 15 minutes (should
 *    fail with 429)
 * 6. Verify rate limiting prevents excessive password reset requests
 */
export async function test_api_password_reset_request_rate_limiting(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const testEmail = typia.random<string & tags.Format<"email">>();

  const registered = await api.functional.todoApp.auth.register(connection, {
    body: typia.random<ITodoAppAuthenticatedUser.IRegister>(),
  });
  typia.assert(registered);
  TestValidator.predicate(
    "user registration succeeds with valid response",
    registered.email.length > 0,
  );

  // Use the registered email for rate limiting tests
  const emailForRateLimitTest = registered.email;

  // Step 2: Submit password reset request 1 (should succeed)
  const resetResponse1 =
    await api.functional.todoApp.auth.request_password_reset.requestPasswordReset(
      connection,
      {
        body: {
          email: emailForRateLimitTest,
        } satisfies ITodoAppAuth.IRequestPasswordResetRequest,
      },
    );
  typia.assert(resetResponse1);
  TestValidator.predicate(
    "first password reset request succeeds",
    resetResponse1.message.length > 0,
  );

  // Step 3: Submit password reset request 2 (should succeed)
  const resetResponse2 =
    await api.functional.todoApp.auth.request_password_reset.requestPasswordReset(
      connection,
      {
        body: {
          email: emailForRateLimitTest,
        } satisfies ITodoAppAuth.IRequestPasswordResetRequest,
      },
    );
  typia.assert(resetResponse2);
  TestValidator.predicate(
    "second password reset request succeeds",
    resetResponse2.message.length > 0,
  );

  // Step 4: Submit password reset request 3 (should succeed)
  const resetResponse3 =
    await api.functional.todoApp.auth.request_password_reset.requestPasswordReset(
      connection,
      {
        body: {
          email: emailForRateLimitTest,
        } satisfies ITodoAppAuth.IRequestPasswordResetRequest,
      },
    );
  typia.assert(resetResponse3);
  TestValidator.predicate(
    "third password reset request succeeds",
    resetResponse3.message.length > 0,
  );

  // Step 5: Submit password reset request 4 within 15 minutes (should fail with 429)
  await TestValidator.httpError(
    "fourth password reset request within 15 minutes triggers rate limit 429",
    429,
    async () => {
      await api.functional.todoApp.auth.request_password_reset.requestPasswordReset(
        connection,
        {
          body: {
            email: emailForRateLimitTest,
          } satisfies ITodoAppAuth.IRequestPasswordResetRequest,
        },
      );
    },
  );
}
