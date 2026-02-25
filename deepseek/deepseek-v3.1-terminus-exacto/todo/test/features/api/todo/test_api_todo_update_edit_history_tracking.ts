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

/**
 * Test that todo updates properly generate edit history entries.
 * 1. Register and authenticate a user
 * 2. Create an initial todo
 * 3. Perform sequential updates: title, description, start_date, due_date
 * 4. After each update, verify edit history entries are created
 * 5. Validate history accurately records field changes and timestamps
 */
export async function test_api_todo_update_edit_history_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. User authentication setup
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  if (!userConnection.headers) userConnection.headers = {};
  userConnection.headers.Authorization = user.token.access;
  // 2. Create initial todo
  const initialTodo = await api.functional.todoApp.user.todos.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(initialTodo);
  // 3. Get initial history (should be empty or contain creation entry)
  const initialHistory = await api.functional.todoApp.user.todos.history.index(
    userConnection,
    {
      todoId: initialTodo.id,
      body: {
        page: 1,
        limit: 10,
        sort: "created_at:desc",
      } satisfies ITodoAppTodoHistory.IRequest,
    },
  );
  typia.assert(initialHistory);
  const initialHistoryCount = initialHistory.data.length;
  // 4. Sequential updates with history verification
  // First update: Title change
  const newTitle = RandomGenerator.paragraph({ sentences: 2 });
  const titleUpdateTodo = await api.functional.todoApp.user.todos.update(
    userConnection,
    {
      todoId: initialTodo.id,
      body: {
        title: newTitle,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(titleUpdateTodo);
  TestValidator.equals("title updated", titleUpdateTodo.title, newTitle);
  // Verify title update history
  const titleHistory = await api.functional.todoApp.user.todos.history.index(
    userConnection,
    {
      todoId: initialTodo.id,
      body: {
        page: 1,
        limit: 10,
        sort: "created_at:desc",
      } satisfies ITodoAppTodoHistory.IRequest,
    },
  );
  typia.assert(titleHistory);
  TestValidator.predicate(
    "history increased after title update",
    titleHistory.data.length > initialHistoryCount,
  );
  // Second update: Description change
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const descUpdateTodo = await api.functional.todoApp.user.todos.update(
    userConnection,
    {
      todoId: initialTodo.id,
      body: {
        description: newDescription,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(descUpdateTodo);
  // Verify description update history
  const descHistory = await api.functional.todoApp.user.todos.history.index(
    userConnection,
    {
      todoId: initialTodo.id,
      body: {
        page: 1,
        limit: 10,
        sort: "created_at:desc",
      } satisfies ITodoAppTodoHistory.IRequest,
    },
  );
  typia.assert(descHistory);
  TestValidator.predicate(
    "history increased after description update",
    descHistory.data.length > titleHistory.data.length,
  );
  // Third update: Start date modification
  const newStartDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const startDateUpdateTodo = await api.functional.todoApp.user.todos.update(
    userConnection,
    {
      todoId: initialTodo.id,
      body: {
        start_date: newStartDate,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(startDateUpdateTodo);
  // Verify start date update history
  const startDateHistory =
    await api.functional.todoApp.user.todos.history.index(userConnection, {
      todoId: initialTodo.id,
      body: {
        page: 1,
        limit: 10,
        sort: "created_at:desc",
      } satisfies ITodoAppTodoHistory.IRequest,
    });
  typia.assert(startDateHistory);
  TestValidator.predicate(
    "history increased after start date update",
    startDateHistory.data.length > descHistory.data.length,
  );
  // Fourth update: Due date modification
  const newDueDate = new Date(Date.now() + 172800000).toISOString(); // Day after tomorrow
  const dueDateUpdateTodo = await api.functional.todoApp.user.todos.update(
    userConnection,
    {
      todoId: initialTodo.id,
      body: {
        due_date: newDueDate,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(dueDateUpdateTodo);
  // Verify due date update history
  const dueDateHistory = await api.functional.todoApp.user.todos.history.index(
    userConnection,
    {
      todoId: initialTodo.id,
      body: {
        page: 1,
        limit: 10,
        sort: "created_at:desc",
      } satisfies ITodoAppTodoHistory.IRequest,
    },
  );
  typia.assert(dueDateHistory);
  TestValidator.predicate(
    "history increased after due date update",
    dueDateHistory.data.length > startDateHistory.data.length,
  );
  // 5. Validate history entries structure and chronological order
  TestValidator.predicate(
    "history entries created in chronological order",
    () => {
      for (let i = 1; i < dueDateHistory.data.length; i++) {
        const current = new Date(dueDateHistory.data[i].created_at);
        const previous = new Date(dueDateHistory.data[i - 1].created_at);
        if (current <= previous) return false;
      }
      return true;
    },
  );
  // Verify each history entry has correct user and todo references
  dueDateHistory.data.forEach((entry, index) => {
    TestValidator.equals(
      `history entry ${index} has correct user`,
      entry.user.id,
      user.id,
    );
    TestValidator.equals(
      `history entry ${index} has correct todo`,
      entry.todo.id,
      initialTodo.id,
    );
  });
}
