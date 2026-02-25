import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTrashItem";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashItem";
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

export async function test_api_trash_restoration_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create user authentication context
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://example.com/registration",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Create multiple todos for testing
  const todos: ITodoAppTodo[] = [];
  for (let i = 0; i < 4; i++) {
    const todo = await api.functional.todoApp.user.todos.create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    todos.push(todo);
  }
  // Soft delete all todos to move them to trash
  for (const todo of todos) {
    await api.functional.todoApp.user.todos.erase(userConnection, {
      todoId: todo.id,
    });
  }
  // Restore some of the todos (first two)
  const restoredTodos: ITodoAppTodo[] = [];
  for (let i = 0; i < 2; i++) {
    const restored = await api.functional.todoApp.user.todos.restore(
      userConnection,
      {
        todoId: todos[i].id,
      },
    );
    typia.assert(restored);
    restoredTodos.push(restored);
  }
  // Test filter: restored_at = null (active trash items only)
  const activeTrashResults = await api.functional.todoApp.user.trash.index(
    userConnection,
    {
      body: {
        restored_at: null,
        page: 1,
        limit: 10,
      } satisfies ITodoAppTrashItem.IRequest,
    },
  );
  typia.assert(activeTrashResults);
  // Should return only the non-restored items (last two todos)
  if (activeTrashResults.data.length !== 2) {
    throw new Error(
      `Expected 2 active trash items, got ${activeTrashResults.data.length}`,
    );
  }
  // Ensure all active trash items are not restored
  for (const item of activeTrashResults.data) {
    if (item.restored_at !== null) {
      throw new Error("Active trash item should have null restored_at");
    }
  }
  // Test filter: restored_at with specific value (restored items only)
  // Since we don't know exact restoration timestamp, test with non-null filter
  const restoredTrashResults = await api.functional.todoApp.user.trash.index(
    userConnection,
    {
      body: {
        restored_at: null,
        deleted_at_from: new Date(Date.now() - 60000).toISOString(),
        page: 1,
        limit: 10,
      } satisfies ITodoAppTrashItem.IRequest,
    },
  );
  typia.assert(restoredTrashResults);
  // Get all trash items to verify total count
  const allTrashResults = await api.functional.todoApp.user.trash.index(
    userConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTrashItem.IRequest,
    },
  );
  typia.assert(allTrashResults);
  if (allTrashResults.data.length !== 4) {
    throw new Error(
      `Expected 4 total trash items, got ${allTrashResults.data.length}`,
    );
  }
  // Count restored vs non-restored items
  const restoredCount = allTrashResults.data.filter(
    (item) => item.restored_at !== null,
  ).length;
  const nonRestoredCount = allTrashResults.data.filter(
    (item) => item.restored_at === null,
  ).length;
  if (restoredCount !== 2) {
    throw new Error(`Expected 2 restored items, got ${restoredCount}`);
  }
  if (nonRestoredCount !== 2) {
    throw new Error(`Expected 2 non-restored items, got ${nonRestoredCount}`);
  }
  // Validate pagination metadata
  if (allTrashResults.pagination.current !== 1) {
    throw new Error(
      `Expected current page 1, got ${allTrashResults.pagination.current}`,
    );
  }
  if (allTrashResults.pagination.records !== 4) {
    throw new Error(
      `Expected 4 total records, got ${allTrashResults.pagination.records}`,
    );
  }
}
