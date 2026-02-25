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

export async function test_api_todo_history_sorted_entries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create a todo with title only
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(todo);
  // 3. First edit: change title and description
  const firstEditTitle = RandomGenerator.paragraph({ sentences: 2 });
  const firstEditDescription = RandomGenerator.content({ paragraphs: 2 });
  await api.functional.todoApp.user.todos.update(userConnection, {
    todoId: todo.id,
    body: {
      title: firstEditTitle,
      description: firstEditDescription,
    } satisfies ITodoAppTodo.IUpdate,
  });
  // 4. Second edit: add start_date and due_date
  const startDate = new Date(Date.now() + 86400000).toISOString(); // tomorrow
  const dueDate = new Date(Date.now() + 604800000).toISOString(); // one week from now
  await api.functional.todoApp.user.todos.update(userConnection, {
    todoId: todo.id,
    body: {
      start_date: startDate,
      due_date: dueDate,
    } satisfies ITodoAppTodo.IUpdate,
  });
  // 5. Third edit: change title again
  const thirdEditTitle = RandomGenerator.paragraph({ sentences: 2 });
  await api.functional.todoApp.user.todos.update(userConnection, {
    todoId: todo.id,
    body: {
      title: thirdEditTitle,
    } satisfies ITodoAppTodo.IUpdate,
  });
  // 6. Retrieve history list
  const historyResponse =
    await api.functional.todoApp.user.todos.histories.index(userConnection, {
      todoId: todo.id,
      body: {} satisfies ITodoAppTodoHistory.IRequest,
    });
  typia.assert(historyResponse);
  // 7. Verify history contains exactly 3 entries
  TestValidator.equals("history entry count", historyResponse.data.length, 3);
  // 8. Verify sorting: most recent first (descending by created_at)
  for (let i = 0; i < historyResponse.data.length - 1; i++) {
    const current = new Date(historyResponse.data[i].created_at).getTime();
    const next = new Date(historyResponse.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      "entries sorted descending by created_at",
      current >= next,
    );
  }
  // 9. Verify each entry's field changes
  // Entry 0: Most recent - title change only (third edit)
  const mostRecentEntry = historyResponse.data[0];
  TestValidator.equals(
    "most recent title changed",
    mostRecentEntry.title,
    thirdEditTitle,
  );
  TestValidator.equals(
    "most recent description unchanged",
    mostRecentEntry.description,
    null,
  );
  TestValidator.equals(
    "most recent start_date unchanged",
    mostRecentEntry.start_date,
    null,
  );
  TestValidator.equals(
    "most recent due_date unchanged",
    mostRecentEntry.due_date,
    null,
  );
  // Entry 1: Middle - start_date and due_date added (second edit)
  const middleEntry = historyResponse.data[1];
  TestValidator.equals("middle title unchanged", middleEntry.title, null);
  TestValidator.equals(
    "middle description unchanged",
    middleEntry.description,
    null,
  );
  TestValidator.predicate(
    "middle start_date set",
    middleEntry.start_date !== null,
  );
  TestValidator.predicate("middle due_date set", middleEntry.due_date !== null);
  // Entry 2: Oldest - title and description changed (first edit)
  const oldestEntry = historyResponse.data[2];
  TestValidator.equals(
    "oldest title changed",
    oldestEntry.title,
    firstEditTitle,
  );
  TestValidator.equals(
    "oldest description changed",
    oldestEntry.description,
    firstEditDescription,
  );
  TestValidator.equals(
    "oldest start_date unchanged",
    oldestEntry.start_date,
    null,
  );
  TestValidator.equals("oldest due_date unchanged", oldestEntry.due_date, null);
  // 10. Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    historyResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records",
    historyResponse.pagination.records,
    3,
  );
}
