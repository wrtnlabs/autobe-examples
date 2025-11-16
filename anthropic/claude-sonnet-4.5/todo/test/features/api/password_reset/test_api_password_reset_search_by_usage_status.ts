import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListPasswordReset";
import type { ITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordReset";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test filtering password reset requests by usage status to distinguish between
 * active and consumed tokens.
 *
 * This scenario validates the ability to filter reset requests based on whether
 * they have been used to successfully reset a password. The test creates a user
 * account, initiates a password reset request (creating an unused token), then
 * searches with the 'used' filter set to false to find unused tokens. The test
 * verifies that only unused password reset requests are returned.
 *
 * Workflow:
 *
 * 1. Create a user account for password reset workflow
 * 2. Initiate a password reset request to generate an unused token
 * 3. Search with 'used: false' filter to verify only unused tokens are returned
 * 4. Validate that the returned token has 'used: false' status
 * 5. Validate that all search results are unused tokens
 */
export async function test_api_password_reset_search_by_usage_status(
  connection: api.IConnection,
) {
  // Step 1: Create a user account for password reset workflow
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Initiate a password reset request to generate an unused token
  const resetResult =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: userEmail,
        } satisfies ITodoListPasswordReset.IRequest,
      },
    );
  typia.assert(resetResult);

  // Step 3: Search with 'used: false' filter to verify only unused tokens are returned
  const unusedTokensPage =
    await api.functional.todoList.user.users.passwordResets.index(connection, {
      userId: user.id,
      body: {
        used: false,
        page: 1,
        limit: 10,
      } satisfies ITodoListPasswordReset.IRequest,
    });
  typia.assert(unusedTokensPage);

  // Step 4: Validate that the search returned results
  TestValidator.predicate(
    "unused tokens search should return at least one result",
    unusedTokensPage.data.length > 0,
  );

  // Step 5: Validate that all returned tokens have 'used: false' status
  for (const resetToken of unusedTokensPage.data) {
    TestValidator.equals(
      "reset token usage status should be false",
      resetToken.used,
      false,
    );
    TestValidator.equals(
      "reset token email should match user email",
      resetToken.email,
      userEmail,
    );
  }

  // Step 6: Validate pagination metadata
  TestValidator.predicate(
    "pagination records should match data length",
    unusedTokensPage.pagination.records >= unusedTokensPage.data.length,
  );
}
