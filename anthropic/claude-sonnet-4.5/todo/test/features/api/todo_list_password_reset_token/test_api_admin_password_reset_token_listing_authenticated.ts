import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListPasswordResetToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordResetToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates that an authenticated admin can list and search password reset
 * tokens for user accounts.
 *
 * 1. Register a new admin account
 * 2. Register a new user account
 * 3. As admin, list password reset tokens for the user
 * 4. Validate response structure and pagination
 * 5. (If possible) List tokens for a second user and confirm correct segregation
 */
export async function test_api_admin_password_reset_token_listing_authenticated(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    href: "https://admin-register.todolist-app.test/",
    referrer: "https://landing.todolist-app.test/",
    ip: undefined,
  } satisfies ITodoListAdmin.IJoin;
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Register a new user (target user for token listing)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const userJoinBody = {
    email: userEmail,
    password: userPassword,
    href: "https://user-register.todolist-app.test/",
    referrer: "https://landing.todolist-app.test/",
    ip: undefined,
  } satisfies ITodoListUser.IJoin;
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: userJoinBody },
  );
  typia.assert(user);

  // 3. As admin, list password reset tokens for the target user
  // Use explicit sorting/pagination/filtering options for coverage
  const filterRequest = {
    // No expired, no used filter; just all tokens
    page: 1,
    limit: 20,
    sort_by: "created_at",
    sort_dir: "desc",
  } satisfies ITodoListPasswordResetToken.IRequest;
  const tokenList: IPageITodoListPasswordResetToken.ISummary =
    await api.functional.todoList.admin.users.passwordResetTokens.index(
      connection,
      {
        userId: user.id,
        body: filterRequest,
      },
    );
  typia.assert(tokenList);
  // Pagination checks
  TestValidator.equals("pagination page is 1", tokenList.pagination.current, 1);
  TestValidator.equals(
    "pagination limit is 20",
    tokenList.pagination.limit,
    20,
  );
  // Every token.user.id should match the queried user's ID
  for (const resetToken of tokenList.data) {
    TestValidator.equals(
      "token user id matches target user",
      resetToken.user.id,
      user.id,
    );
  }
  // 4. If possible, try listing for a non-existent/other user to confirm admin can list multiple users (optional)
  // Register a second user
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2Password = RandomGenerator.alphaNumeric(12);
  const user2JoinBody = {
    email: user2Email,
    password: user2Password,
    href: "https://user2-register.todolist-app.test/",
    referrer: "https://user2-landing.todolist-app.test/",
    ip: undefined,
  } satisfies ITodoListUser.IJoin;
  const user2: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: user2JoinBody },
  );
  typia.assert(user2);
  const tokenList2: IPageITodoListPasswordResetToken.ISummary =
    await api.functional.todoList.admin.users.passwordResetTokens.index(
      connection,
      {
        userId: user2.id,
        body: filterRequest,
      },
    );
  typia.assert(tokenList2);
  for (const resetToken of tokenList2.data) {
    TestValidator.equals(
      "token user id matches second user",
      resetToken.user.id,
      user2.id,
    );
  }
}
