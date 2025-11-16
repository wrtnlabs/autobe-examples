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
 * Test that administrators can search and retrieve all password reset requests
 * for a specific user.
 *
 * This test validates the complete workflow of admin-based password reset
 * request monitoring:
 *
 * 1. Admin authenticates with proper credentials
 * 2. Regular user account is created
 * 3. User requests a password reset
 * 4. Admin searches for that user's reset requests
 * 5. Validates paginated results contain correct reset information
 *
 * The test ensures that:
 *
 * - Admin can access password reset data for any user
 * - Search returns proper pagination metadata
 * - Reset request data includes token status, creation time, and expiration time
 * - The response structure matches expected types
 */
export async function test_api_password_reset_admin_search_all_requests(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a regular user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
        ip: "192.168.1.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 3: User requests password reset
  const resetRequestResult: ITodoListPasswordReset.IRequestResult =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: userEmail,
        } satisfies ITodoListPasswordReset.IRequest,
      },
    );
  typia.assert(resetRequestResult);

  // Step 4: Admin searches for password reset requests for the specific user
  const searchResult: IPageITodoListPasswordReset.ISummary =
    await api.functional.todoList.admin.users.passwordResets.index(connection, {
      userId: user.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoListPasswordReset.IRequest,
    });
  typia.assert(searchResult);

  // Step 5: Validate pagination metadata
  TestValidator.predicate(
    "pagination should be valid",
    searchResult.pagination.current >= 0 &&
      searchResult.pagination.limit > 0 &&
      searchResult.pagination.records >= 0 &&
      searchResult.pagination.pages >= 0,
  );

  // Step 6: Validate that at least one password reset request exists
  TestValidator.predicate(
    "should have at least one password reset request",
    searchResult.data.length > 0,
  );

  // Step 7: Validate the first password reset request data
  const firstReset = searchResult.data[0];
  typia.assert(firstReset);

  TestValidator.equals(
    "reset request user ID should match",
    firstReset.todo_list_user_id,
    user.id,
  );

  TestValidator.equals(
    "reset request email should match",
    firstReset.email,
    userEmail,
  );

  TestValidator.predicate(
    "reset request should have valid token",
    typeof firstReset.token === "string" && firstReset.token.length > 0,
  );

  TestValidator.predicate(
    "reset request should have creation timestamp",
    typeof firstReset.created_at === "string" &&
      firstReset.created_at.length > 0,
  );

  TestValidator.predicate(
    "reset request should have expiration timestamp",
    typeof firstReset.expires_at === "string" &&
      firstReset.expires_at.length > 0,
  );

  TestValidator.predicate(
    "reset request should have used status",
    typeof firstReset.used === "boolean",
  );
}
