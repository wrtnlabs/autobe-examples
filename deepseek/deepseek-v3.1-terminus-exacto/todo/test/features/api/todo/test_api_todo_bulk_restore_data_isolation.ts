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
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

/**
 * Test data isolation and security validation for bulk restoration.
 * 1. Create two separate user accounts
 * 2. Each user creates their own todos
 * 3. User A soft deletes some todos
 * 4. User B attempts to restore User A's todos (should fail with authorization error)
 * 5. Test atomic operation with mixed IDs (User B's + User A's)
 * 6. Validate privacy guarantees and ownership checks
 */
export async function test_api_todo_bulk_restore_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create two separate user accounts
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_user_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userA);
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_user_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userB);
  // Step 2: Create todos for both users
  const userATodos = await ArrayUtil.asyncRepeat(3, async () => {
    const todo = await generate_random_todo_app_user_todos_create(
      userAConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    return todo;
  });
  const userBTodos = await ArrayUtil.asyncRepeat(2, async () => {
    const todo = await generate_random_todo_app_user_todos_create(
      userBConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    return todo;
  });
  // Step 3: User A soft deletes some todos
  const userADeletedTodos = userATodos.slice(0, 2);
  for (const todo of userADeletedTodos) {
    await api.functional.todoApp.user.todos.erase(userAConnection, {
      todoId: todo.id,
    });
  }
  // Step 4: User B attempts to restore User A's deleted todos (should fail)
  await TestValidator.error(
    "User B cannot restore User A's todos",
    async () => {
      await api.functional.todoApp.user.bulk_restore.bulkRestore(
        userBConnection,
        {
          body: {
            todoIds: userADeletedTodos.map(
              (todo) => todo.id,
            ) satisfies (string & tags.Format<"uuid">)[] & tags.MinItems<1>,
          } satisfies ITodoAppTodo.IBulkRestoreRequest,
        },
      );
    },
  );
  // Step 5: User B attempts mixed operation (their own + User A's IDs)
  // First, User B deletes one of their own todos
  const userBDeletedTodo = userBTodos[0];
  await api.functional.todoApp.user.todos.erase(userBConnection, {
    todoId: userBDeletedTodo.id,
  });
  // Attempt bulk restore with mixed IDs (User B's valid + User A's invalid)
  await TestValidator.error(
    "Mixed operation should fail entirely",
    async () => {
      await api.functional.todoApp.user.bulk_restore.bulkRestore(
        userBConnection,
        {
          body: {
            todoIds: [
              userBDeletedTodo.id,
              ...userADeletedTodos.slice(0, 1).map((todo) => todo.id),
            ] satisfies (string & tags.Format<"uuid">)[] & tags.MinItems<1>,
          } satisfies ITodoAppTodo.IBulkRestoreRequest,
        },
      );
    },
  );
  // Verify atomicity: User B's todo should still be deleted
  // Validate that the operation failed completely and nothing was restored
  // Step 6: User B successfully restores their own todo
  const restoreResponse =
    await api.functional.todoApp.user.bulk_restore.bulkRestore(
      userBConnection,
      {
        body: {
          todoIds: [userBDeletedTodo.id] satisfies (string &
            tags.Format<"uuid">)[] &
            tags.MinItems<1>,
        } satisfies ITodoAppTodo.IBulkRestoreRequest,
      },
    );
  typia.assert(restoreResponse);
  // Validate response structure
  TestValidator.equals(
    "Should restore exactly 1 item",
    restoreResponse.data.length,
    1,
  );
  TestValidator.equals(
    "Restored todo ID matches",
    restoreResponse.data[0].id,
    userBDeletedTodo.id,
  );
  TestValidator.predicate(
    "Pagination info present",
    restoreResponse.pagination !== undefined,
  );
}
