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

export async function test_api_todo_list_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate using the utility function
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  typia.assert(user);
  // Create multiple todos using the correct API approach
  // Create 7 todos to test pagination
  for (let i = 0; i < 7; i++) {
    // The create function appears to not require body parameters based on API definition
    await api.functional.todoApp.user.todos.create(userConnection);
  }
  // Test default pagination (should return all items)
  const defaultPage =
    await api.functional.todoApp.user.todos.index(userConnection);
  typia.assert(defaultPage);
  // Validate pagination metadata for default request
  TestValidator.equals(
    "default page current page",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "default page total records",
    defaultPage.pagination.records,
    7,
  );
  TestValidator.predicate("default page has data", defaultPage.data.length > 0);
  // Validate todo structure and user ownership
  if (defaultPage.data.length > 0) {
    const todo = defaultPage.data[0];
    TestValidator.predicate("todo has id", !!todo.id);
    TestValidator.predicate("todo has title", !!todo.title);
    TestValidator.predicate(
      "todo has completion_status",
      !!todo.completion_status,
    );
    TestValidator.predicate("todo has created_at", !!todo.created_at);
    TestValidator.predicate("todo has user ownership info", !!todo.user);
    TestValidator.equals(
      "todo belongs to authenticated user",
      todo.user.id,
      user.id,
    );
  }
  // Test that all created todos are returned in the default page
  TestValidator.equals(
    "all todos returned in default page",
    defaultPage.data.length,
    7,
  );
  // Verify todo completion status defaults to 'incomplete'
  for (const todo of defaultPage.data) {
    TestValidator.predicate(
      "todo has valid completion status",
      todo.completion_status === "incomplete" ||
        todo.completion_status === "complete",
    );
  }
}
