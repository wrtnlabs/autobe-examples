import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordReset";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test multiple password reset requests creation for a single user.
 *
 * This test validates that a user can create multiple password reset requests
 * successfully. Each request generates a new reset token and returns a
 * confirmation message. The test ensures the system allows multiple concurrent
 * reset requests for the same user account.
 *
 * Note: The original scenario requested retrieving individual reset requests by
 * ID, but the password reset request endpoint only returns a confirmation
 * message without the reset ID. Therefore, this test focuses on validating
 * successful creation of multiple reset requests.
 *
 * Test Flow:
 *
 * 1. Register and authenticate a new user
 * 2. Create multiple password reset requests (3 requests)
 * 3. Validate each request returns a confirmation message
 * 4. Verify all requests complete successfully
 */
export async function test_api_password_reset_user_multiple_requests_tracking(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "SecurePass123!";

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  TestValidator.predicate(
    "user registration successful with valid email",
    user.email === userEmail,
  );

  // Step 2: Create multiple password reset requests
  const resetCount = 3;
  const resetRequests: ITodoListPasswordReset.IRequestResult[] = [];

  for (let i = 0; i < resetCount; i++) {
    const resetResult: ITodoListPasswordReset.IRequestResult =
      await api.functional.auth.user.password.reset.request.requestPasswordReset(
        connection,
        {
          body: {
            email: userEmail,
          } satisfies ITodoListPasswordReset.IRequest,
        },
      );
    typia.assert(resetResult);
    resetRequests.push(resetResult);
  }

  // Step 3: Validate all reset requests were created successfully
  TestValidator.equals(
    "created expected number of reset requests",
    resetRequests.length,
    resetCount,
  );

  // Step 4: Verify each reset request has a valid confirmation message
  for (let i = 0; i < resetRequests.length; i++) {
    TestValidator.predicate(
      `reset request ${i + 1} has non-empty confirmation message`,
      typeof resetRequests[i].message === "string" &&
        resetRequests[i].message.length > 0,
    );
  }
}
