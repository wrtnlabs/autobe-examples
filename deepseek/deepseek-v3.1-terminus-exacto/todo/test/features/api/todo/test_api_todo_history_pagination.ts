import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistory";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
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

export async function test_api_todo_history_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate first user
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await api.functional.todoApp.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(authorizedUser);
  // Step 2: Create a todo item
  const todo = await api.functional.todoApp.user.todos.create(userConnection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);
  // Step 3: Generate multiple sequential edits to create history
  const editCount = 10;
  const editPromises = ArrayUtil.repeat(editCount, (index) => {
    const body: ITodoAppTodo.IUpdate = {};
    // Use different field combinations for variety
    if (index % 4 === 0) {
      body.title = RandomGenerator.paragraph({ sentences: 1 });
    }
    if (index % 4 === 1) {
      body.description = RandomGenerator.paragraph({ sentences: 2 });
    }
    if (index % 4 === 2) {
      body.start_date = new Date().toISOString();
    }
    if (index % 4 === 3) {
      body.due_date = new Date(
        Date.now() + 86400000 * (index + 1),
      ).toISOString();
    }
    return api.functional.todoApp.user.todos.update(userConnection, {
      todoId: todo.id,
      body: body satisfies ITodoAppTodo.IUpdate,
    });
  });
  const editResults = await Promise.all(editPromises);
  editResults.forEach((result) => typia.assert(result));
  // Step 4: Test pagination with different parameters
  // Test default pagination (page 1, limit 10)
  const defaultPage = await api.functional.todoApp.user.todos.history.index(
    userConnection,
    {
      todoId: todo.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodoHistory.IRequest,
    },
  );
  typia.assert(defaultPage);
  // Validate pagination metadata
  TestValidator.equals(
    "total records includes creation + edits",
    defaultPage.pagination.records,
    editCount + 1,
  );
  TestValidator.equals(
    "current page matches request",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches request",
    defaultPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "total pages calculated correctly",
    defaultPage.pagination.pages === Math.ceil((editCount + 1) / 10),
  );
  // Validate each history entry structure
  defaultPage.data.forEach((entry) => {
    typia.assert(entry);
    TestValidator.equals(
      "entry user ID matches authenticated user",
      entry.user.id,
      authorizedUser.id,
    );
    TestValidator.equals(
      "entry todo ID matches created todo",
      entry.todo.id,
      todo.id,
    );
  });
  // Test boundary pagination - minimum limit (1)
  const minLimitPage = await api.functional.todoApp.user.todos.history.index(
    userConnection,
    {
      todoId: todo.id,
      body: {
        page: 1,
        limit: 1,
      } satisfies ITodoAppTodoHistory.IRequest,
    },
  );
  typia.assert(minLimitPage);
  TestValidator.equals(
    "min limit page contains one entry",
    minLimitPage.data.length,
    1,
  );
  // Test pagination beyond available data
  const beyondPage = await api.functional.todoApp.user.todos.history.index(
    userConnection,
    {
      todoId: todo.id,
      body: {
        page: 100,
        limit: 10,
      } satisfies ITodoAppTodoHistory.IRequest,
    },
  );
  typia.assert(beyondPage);
  TestValidator.equals(
    "beyond page returns empty array",
    beyondPage.data.length,
    0,
  );
  TestValidator.equals(
    "beyond page preserves page number",
    beyondPage.pagination.current,
    100,
  );
  // Test maximum allowed limit (100)
  const maxLimitPage = await api.functional.todoApp.user.todos.history.index(
    userConnection,
    {
      todoId: todo.id,
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodoHistory.IRequest,
    },
  );
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "max limit page returns all records",
    maxLimitPage.data.length,
    editCount + 1,
  );
  // Step 5: Verify chronological order (newest entries first)
  for (let i = 0; i < maxLimitPage.data.length - 1; i++) {
    const currentTimestamp = new Date(
      maxLimitPage.data[i].created_at,
    ).getTime();
    const nextTimestamp = new Date(
      maxLimitPage.data[i + 1].created_at,
    ).getTime();
    TestValidator.predicate(
      "entries in reverse chronological order",
      currentTimestamp >= nextTimestamp,
    );
  }
  // Step 6: Security test - create second user and attempt to access first user's todo history
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUser = await api.functional.todoApp.auth.user.join(
    secondUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(secondUser);
  // Attempt to access first user's todo history should fail
  await TestValidator.error(
    "unauthorized access to other user's todo history",
    async () => {
      await api.functional.todoApp.user.todos.history.index(
        secondUserConnection,
        {
          todoId: todo.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies ITodoAppTodoHistory.IRequest,
        },
      );
    },
  );
}
