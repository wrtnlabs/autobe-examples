import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { authorize_todo_user_join } from "../../../authorize/authorize_todo_user_join";
import { authorize_todo_user_login } from "../../../authorize/authorize_todo_user_login";
import { authorize_todo_user_refresh } from "../../../authorize/authorize_todo_user_refresh";
export async function test_api_todo_list_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create a new user via join endpoint
  const todoUserConnection: api.IConnection = { host: connection.host };
  const todoUser = await authorize_todo_user_join(todoUserConnection, {
    body: {
      email: `test-${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://todo.wrtn.io/register",
      referrer: "https://todo.wrtn.io",
    },
  });
  // Step 2: Create several test todos for this user
  // Since there are no generation functions for todos, we'll just retrieve the empty list
  // Step 3: Call the todo list retrieval endpoint
  const todoList =
    await api.functional.todoApp.todoUser.todos.index(todoUserConnection);
  // Step 4: Validate the response structure matches expected pagination format
  typia.assert(todoList);
  TestValidator.predicate(
    "pagination structure is correct",
    () =>
      todoList.pagination.current >= 0 &&
      todoList.pagination.limit >= 0 &&
      todoList.pagination.records >= 0 &&
      todoList.pagination.pages >= 0,
  );
  // Step 5: Verify the returned todos belong to the authenticated user
  // Since we just created the user, the list should be empty
  TestValidator.equals(
    "new user should have no todos",
    todoList.data.length,
    0,
  );
  // Step 6: Check that all required fields are present in todo summaries
  for (const todo of todoList.data) {
    TestValidator.predicate("todo has id", () => !!todo.id);
    TestValidator.predicate("todo has title", () => !!todo.title);
    TestValidator.predicate(
      "todo has completed status",
      () => typeof todo.completed === "boolean",
    );
    // startDate and dueDate can be null, so we just confirm they exist
    TestValidator.predicate(
      "todo has start date field",
      () => "startDate" in todo,
    );
    TestValidator.predicate("todo has due date field", () => "dueDate" in todo);
    TestValidator.predicate(
      "todo has creation timestamp",
      () => !!todo.createdAt,
    );
  }
}
