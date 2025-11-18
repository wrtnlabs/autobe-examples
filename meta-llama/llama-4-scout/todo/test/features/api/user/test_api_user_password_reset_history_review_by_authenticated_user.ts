import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserPasswordReset";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserPasswordReset";

/**
 * Validate authenticated user's ability to view their password reset event
 * history.
 *
 * - New user registration
 * - Simulate triggering multiple password reset events
 * - Retrieve password reset log history
 * - Validate audit log, pagination, and access control
 * - Validate negative case (other user cannot see history)
 */
export async function test_api_user_password_reset_history_review_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Register main test user
  const testUserEmail = typia.random<string & tags.Format<"email">>();
  const testUserPassword = typia.random<string & tags.Format<"password">>();
  const testUserDisplayName = RandomGenerator.name();
  const testUserJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: testUserEmail,
      password: testUserPassword,
      display_name: testUserDisplayName,
      href: "https://app.todo.local/join",
      referrer: "https://app.todo.local/",
      ip: undefined,
    } satisfies ITodoListUser.IJoin,
  });
  typia.assert(testUserJoin);

  // 2. Simulate multiple password reset events
  const repeatCount = 3;
  for (let i = 0; i < repeatCount; ++i) {
    await api.functional.todoList.user.users.me.passwordResets.index(
      connection,
      {
        body: {
          email: testUserEmail,
        } satisfies ITodoListUserPasswordReset.IRequest,
      },
    );
  }

  // 3. Retrieve password reset log events for authenticated user
  const passwordResetsResult =
    await api.functional.todoList.user.users.me.passwordResets.index(
      connection,
      {
        body: {
          email: testUserEmail,
        } satisfies ITodoListUserPasswordReset.IRequest,
      },
    );
  typia.assert(passwordResetsResult);

  // 4. Validate that each record belongs to the authenticated user, is correct email, and count >= repeatCount
  TestValidator.predicate(
    "password reset audit log has expected event count",
    passwordResetsResult.data.length >= repeatCount,
  );
  for (const record of passwordResetsResult.data) {
    TestValidator.equals(
      "event user ID matches authenticated user",
      record.todo_list_user_id,
      testUserJoin.id,
    );
  }

  // 5. Pagination information present
  TestValidator.equals(
    "pagination field present with correct type",
    typeof passwordResetsResult.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination.limit is number",
    typeof passwordResetsResult.pagination.limit,
    "number",
  );

  // 6. Negative case: another user cannot access this history
  // Register another user
  const otherUserEmail = typia.random<string & tags.Format<"email">>();
  const otherUserPassword = typia.random<string & tags.Format<"password">>();
  const otherUserDisplayName = RandomGenerator.name();
  const otherUserJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: otherUserEmail,
      password: otherUserPassword,
      display_name: otherUserDisplayName,
      href: "https://app.todo.local/join",
      referrer: "https://app.todo.local/",
      ip: undefined,
    } satisfies ITodoListUser.IJoin,
  });
  typia.assert(otherUserJoin);

  // Switch to other user by registering (sets new token)
  const otherUserResult =
    await api.functional.todoList.user.users.me.passwordResets.index(
      connection,
      {
        body: {
          email: otherUserEmail,
        } satisfies ITodoListUserPasswordReset.IRequest,
      },
    );
  typia.assert(otherUserResult);

  TestValidator.equals(
    "another user sees no password reset events",
    otherUserResult.data.length,
    0,
  );
}
