import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test the critical privacy requirement that users can only access their own todos.
 * Authenticate as two different users (User A and User B). User A creates several
 * todos with varied content and completion statuses. User B creates their own distinct
 * set of todos. Then test that when User A retrieves their todo list, only their own
 * todos are returned and User B's todos are completely invisible. Similarly, verify
 * that User B only sees their own todos. This validates the fundamental data isolation
 * requirement that is central to the application's privacy guarantees.
 */
export async function test_api_todo_privacy_isolation_across_users(
  connection: api.IConnection,
): Promise<void> {
  // Create first user account
  const userAConnection: api.IConnection = { host: connection.host };
  const userAAuth = await authorize_user_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userAAuth);
  // Create todos for first user
  const userATodos = ArrayUtil.repeat(3, (index) => ({
    title: `User A Todo ${index + 1}`,
  }));
  for (const todoData of userATodos) {
    await api.functional.todoApp.user.todos.create(userAConnection);
  }
  // Create second user account
  const userBConnection: api.IConnection = { host: connection.host };
  const userBAuth = await authorize_user_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userBAuth);
  // Create todos for second user
  const userBTodos = ArrayUtil.repeat(3, (index) => ({
    title: `User B Todo ${index + 1}`,
  }));
  for (const todoData of userBTodos) {
    await api.functional.todoApp.user.todos.create(userBConnection);
  }
  // Verify User A can only see their own todos
  const userATodoList =
    await api.functional.todoApp.user.todos.index(userAConnection);
  typia.assert(userATodoList);
  // All todos should belong to User A
  for (const todo of userATodoList.data) {
    TestValidator.equals(
      "User A todo belongs to User A",
      todo.user.id,
      userAAuth.id,
    );
  }
  // Verify User B can only see their own todos
  const userBTodoList =
    await api.functional.todoApp.user.todos.index(userBConnection);
  typia.assert(userBTodoList);
  // All todos should belong to User B
  for (const todo of userBTodoList.data) {
    TestValidator.equals(
      "User B todo belongs to User B",
      todo.user.id,
      userBAuth.id,
    );
  }
  // Verify cross-user isolation - User A should not see User B's todos
  const userATodoIds = userATodoList.data.map((todo) => todo.id);
  const userBTodoIds = userBTodoList.data.map((todo) => todo.id);
  // Check that there are no overlapping todo IDs between users
  const overlappingIds = userATodoIds.filter((id) => userBTodoIds.includes(id));
  TestValidator.equals(
    "No overlapping todo IDs between users",
    overlappingIds.length,
    0,
  );
  // Verify each user sees the correct number of todos
  TestValidator.equals(
    "User A sees correct number of todos",
    userATodoList.data.length,
    3,
  );
  TestValidator.equals(
    "User B sees correct number of todos",
    userBTodoList.data.length,
    3,
  );
}
