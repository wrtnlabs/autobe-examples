import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListPasswordReset";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordReset";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test admin filtering of password reset requests by usage status.
 *
 * This test validates that administrators can filter password reset requests by
 * their usage status (used vs unused tokens). The test creates password reset
 * tokens and verifies that admin filtering accurately returns only tokens
 * matching the specified usage status.
 *
 * Note: Since the API does not provide an endpoint to complete password resets
 * and mark tokens as used, this test focuses on validating the filtering
 * mechanism with unused tokens and verifying the filter parameter works
 * correctly.
 *
 * Test workflow:
 *
 * 1. Create admin account for authentication
 * 2. Create user account for password reset testing
 * 3. Create multiple password reset requests (all will be unused initially)
 * 4. Admin filters with used=false and verifies unused tokens returned
 * 5. Admin filters with used=true and verifies correct filtering behavior
 */
export async function test_api_password_reset_admin_filter_by_usage_status(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "password123",
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 3: Request first password reset
  const firstResetRequest =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: userEmail,
        } satisfies ITodoListPasswordReset.IRequest,
      },
    );
  typia.assert(firstResetRequest);

  // Wait a moment to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 4: Request second password reset
  const secondResetRequest =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: userEmail,
        } satisfies ITodoListPasswordReset.IRequest,
      },
    );
  typia.assert(secondResetRequest);

  // Step 5: Admin searches for unused tokens (used=false)
  const unusedTokensPage =
    await api.functional.todoList.admin.users.passwordResets.index(connection, {
      userId: user.id,
      body: {
        used: false,
        page: 1,
        limit: 10,
      } satisfies ITodoListPasswordReset.IRequest,
    });
  typia.assert(unusedTokensPage);

  // Validate unused tokens response structure
  TestValidator.predicate(
    "unused tokens page should have pagination",
    unusedTokensPage.pagination !== null &&
      unusedTokensPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "unused tokens data should be array",
    Array.isArray(unusedTokensPage.data),
  );

  // Validate all returned tokens are marked as unused
  TestValidator.predicate(
    "all returned tokens should be unused",
    unusedTokensPage.data.every((token) => token.used === false),
  );

  // Validate we have unused tokens (at least the two we created)
  TestValidator.predicate(
    "should have at least 2 unused tokens",
    unusedTokensPage.data.length >= 2,
  );

  // Validate email matches for all tokens
  TestValidator.predicate(
    "all tokens should belong to the test user",
    unusedTokensPage.data.every((token) => token.email === userEmail),
  );

  // Step 6: Admin searches for used tokens (used=true)
  const usedTokensPage =
    await api.functional.todoList.admin.users.passwordResets.index(connection, {
      userId: user.id,
      body: {
        used: true,
        page: 1,
        limit: 10,
      } satisfies ITodoListPasswordReset.IRequest,
    });
  typia.assert(usedTokensPage);

  // Validate used tokens response structure
  TestValidator.predicate(
    "used tokens page should have pagination",
    usedTokensPage.pagination !== null &&
      usedTokensPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "used tokens data should be array",
    Array.isArray(usedTokensPage.data),
  );

  // Validate all returned tokens are marked as used
  TestValidator.predicate(
    "all returned tokens should be used",
    usedTokensPage.data.every((token) => token.used === true),
  );

  // Since we cannot create used tokens through the API, we expect empty result
  // This validates the filter is working correctly - no used tokens should be returned
  TestValidator.predicate(
    "should have no used tokens initially",
    usedTokensPage.data.length === 0,
  );
}
