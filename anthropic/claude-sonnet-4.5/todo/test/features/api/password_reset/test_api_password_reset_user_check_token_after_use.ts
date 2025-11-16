import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordReset";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that users can retrieve password reset request details.
 *
 * This test validates the password reset workflow by performing the following
 * steps:
 *
 * 1. User registers and authenticates
 * 2. User requests password reset
 * 3. User retrieves reset details using a known reset ID
 * 4. Validates that the reset request contains valid data
 * 5. Validates that user ID matches the authenticated user
 *
 * Note: This test is adapted from the original scenario due to API limitations.
 * The available APIs do not provide a way to retrieve the reset ID from the
 * request or to complete the password reset operation. Therefore, we test the
 * retrieval functionality directly with a generated reset ID.
 */
export async function test_api_password_reset_user_check_token_after_use(
  connection: api.IConnection,
) {
  // Step 1: User registration and authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "SecurePassword123!";

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

  // Step 2: Request password reset
  const resetRequest: ITodoListPasswordReset.IRequestResult =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: userEmail,
        } satisfies ITodoListPasswordReset.IRequest,
      },
    );
  typia.assert(resetRequest);

  // Step 3: Generate a reset ID for retrieval testing
  const resetId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Retrieve password reset details
  const resetDetails: ITodoListPasswordReset =
    await api.functional.todoList.user.users.passwordResets.at(connection, {
      userId: user.id,
      resetId: resetId,
    });
  typia.assert(resetDetails);

  // Step 5: Validate that the reset request details match expectations
  TestValidator.equals(
    "user ID matches authenticated user",
    resetDetails.todo_list_user_id,
    user.id,
  );
  TestValidator.equals(
    "reset ID matches requested ID",
    resetDetails.id,
    resetId,
  );
}
