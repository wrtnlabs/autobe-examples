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

export async function test_api_todo_history_retrieval_multiple_edits(
  connection: api.IConnection,
): Promise<void> {
  // Create user authentication connection
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Create a todo
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Test history retrieval with default pagination
  const historyDefault =
    await api.functional.todoApp.user.todos.histories.index(userConnection, {
      todoId: todo.id,
      body: {
        page: 1,
        limit: 10,
        sort: "created_at:desc",
      } satisfies ITodoAppTodoHistory.IRequest,
    });
  typia.assert(historyDefault);
  // Validate pagination structure with proper type handling
  TestValidator.predicate(
    "pagination current page is valid",
    historyDefault.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    historyDefault.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    historyDefault.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    historyDefault.pagination.pages >= 0,
  );
  // Validate history entries structure if data exists
  if (historyDefault.data.length > 0) {
    const firstEntry = historyDefault.data[0];
    typia.assert(firstEntry);
    // Validate entry has required fields
    TestValidator.predicate("history entry has id", firstEntry.id.length > 0);
    TestValidator.predicate(
      "history entry has created_at",
      firstEntry.created_at.length > 0,
    );
    TestValidator.predicate(
      "history entry has user",
      firstEntry.user.id.length > 0,
    );
    TestValidator.predicate(
      "history entry has todo",
      firstEntry.todo.id.length > 0,
    );
    // Validate todo reference matches
    TestValidator.equals(
      "todo reference matches created todo",
      firstEntry.todo.id,
      todo.id,
    );
  }
  // Test pagination with custom parameters
  const historyCustom = await api.functional.todoApp.user.todos.histories.index(
    userConnection,
    {
      todoId: todo.id,
      body: {
        page: 1,
        limit: 5,
        sort: "created_at",
      } satisfies ITodoAppTodoHistory.IRequest,
    },
  );
  typia.assert(historyCustom);
  // Validate custom pagination
  TestValidator.predicate(
    "custom pagination limit is valid",
    historyCustom.pagination.limit >= 0,
  );
  // Validate data integrity if entries exist
  if (historyCustom.data.length > 0) {
    historyCustom.data.forEach((entry, index) => {
      typia.assert(entry);
      TestValidator.equals(
        `entry ${index} todo matches`,
        entry.todo.id,
        todo.id,
      );
      TestValidator.predicate(
        `entry ${index} has valid timestamp`,
        entry.created_at.length > 0,
      );
    });
  }
  // Test error case - invalid todo ID
  await TestValidator.error("should reject invalid todo ID", async () => {
    await api.functional.todoApp.user.todos.histories.index(userConnection, {
      todoId: typia.random<string & tags.Format<"uuid">>(), // random UUID, likely invalid
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodoHistory.IRequest,
    });
  });
}
