import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodo";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that todo list retrieval properly isolates data between different users.
 *
 * This critical security test validates that the todo_list_user_id filtering
 * (extracted from JWT token) correctly enforces data isolation and prevents
 * unauthorized access to other users' tasks.
 *
 * Test workflow:
 *
 * 1. Create first user account (User A)
 * 2. Create todos for User A
 * 3. Create second user account (User B) - this switches authentication context
 * 4. Verify User B's todo list is empty (doesn't contain User A's todos)
 * 5. Create todos for User B
 * 6. Verify User B only sees their own todos (not User A's todos)
 */
export async function test_api_todo_list_user_isolation(
  connection: api.IConnection,
) {
  // Step 1: Create first user account (User A)
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userA: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userAEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(userA);

  // Step 2: Create todos for User A
  const userATodoCount = 3;
  const userATodos: ITodoListTodo[] = await ArrayUtil.asyncRepeat(
    userATodoCount,
    async () => {
      const todo: ITodoListTodo =
        await api.functional.todoList.user.todos.create(connection, {
          body: {
            title: RandomGenerator.paragraph({ sentences: 5 }),
          } satisfies ITodoListTodo.ICreate,
        });
      typia.assert(todo);
      return todo;
    },
  );

  // Verify User A has created todos
  const userAList: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {} satisfies ITodoListTodo.IRequest,
    });
  typia.assert(userAList);
  TestValidator.equals(
    "User A should have created todos",
    userAList.data.length,
    userATodoCount,
  );

  // Step 3: Create second user account (User B) - authentication context switches
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userB: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userBEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(userB);

  // Step 4: Verify User B's todo list is empty (critical security check)
  const userBInitialList: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {} satisfies ITodoListTodo.IRequest,
    });
  typia.assert(userBInitialList);
  TestValidator.equals(
    "User B should have empty todo list initially",
    userBInitialList.data.length,
    0,
  );

  // Verify User B cannot see User A's todos by checking none of User A's todo IDs exist
  const userATodoIds = userATodos.map((todo) => todo.id);
  const userBHasUserATodos = userBInitialList.data.some((todo) =>
    userATodoIds.includes(todo.id),
  );
  TestValidator.predicate(
    "User B should not see any of User A's todos",
    !userBHasUserATodos,
  );

  // Step 5: Create todos for User B
  const userBTodoCount = 2;
  const userBTodos: ITodoListTodo[] = await ArrayUtil.asyncRepeat(
    userBTodoCount,
    async () => {
      const todo: ITodoListTodo =
        await api.functional.todoList.user.todos.create(connection, {
          body: {
            title: RandomGenerator.paragraph({ sentences: 4 }),
          } satisfies ITodoListTodo.ICreate,
        });
      typia.assert(todo);
      return todo;
    },
  );

  // Step 6: Verify User B only sees their own todos
  const userBFinalList: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {} satisfies ITodoListTodo.IRequest,
    });
  typia.assert(userBFinalList);
  TestValidator.equals(
    "User B should only see their own todos",
    userBFinalList.data.length,
    userBTodoCount,
  );

  // Verify all of User B's todos are in the list
  const userBTodoIds = userBTodos.map((todo) => todo.id);
  const userBListIds = userBFinalList.data.map((todo) => todo.id);
  const allUserBTodosPresent = userBTodoIds.every((id) =>
    userBListIds.includes(id),
  );
  TestValidator.predicate(
    "All of User B's todos should be present in their list",
    allUserBTodosPresent,
  );

  // Verify User B still cannot see User A's todos (final isolation check)
  const userBSeesUserATodos = userBFinalList.data.some((todo) =>
    userATodoIds.includes(todo.id),
  );
  TestValidator.predicate(
    "User B should not see User A's todos in their final list",
    !userBSeesUserATodos,
  );
}
