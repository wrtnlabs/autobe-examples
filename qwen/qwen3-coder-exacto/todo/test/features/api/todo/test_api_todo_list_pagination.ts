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
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";
import { generate_random_todo_app_todo_user_todos_create } from "../../../generate/generate_random_todo_app_todo_user_todos_create";
import { authorize_todo_user_join } from "../../../authorize/authorize_todo_user_join";
import { authorize_todo_user_login } from "../../../authorize/authorize_todo_user_login";
import { authorize_todo_user_refresh } from "../../../authorize/authorize_todo_user_refresh";
export async function test_api_todo_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new todo user through join functionality
  const todoUser = await authorize_todo_user_join(connection, {});
  // 2. Create multiple todos for pagination testing
  const todoConnection: api.IConnection = { host: connection.host };
  todoConnection.headers = { Authorization: `Bearer ${todoUser.token.access}` };
  // Create 25 todos to have enough for pagination testing
  const todos = await ArrayUtil.asyncRepeat(25, async () => {
    return await generate_random_todo_app_todo_user_todos_create(
      todoConnection,
      {},
    );
  });
  // 3. Test pagination functionality with default page size (20)
  const firstPage =
    await api.functional.todoApp.todoUser.todos.index(todoConnection);
  typia.assert(firstPage);
  // Verify pagination metadata for first page
  TestValidator.predicate(
    "first page should have correct pagination metadata",
    () =>
      firstPage.pagination.current === 1 &&
      firstPage.pagination.limit === 20 &&
      firstPage.pagination.records === 25 &&
      firstPage.pagination.pages === 2,
  );
  // Verify first page has 20 items
  TestValidator.equals(
    "first page should contain 20 todos",
    firstPage.data.length,
    20,
  );
  // Verify todos are sorted by creation date (newest first) by default
  for (let i = 0; i < firstPage.data.length - 1; i++) {
    const current = new Date(firstPage.data[i].createdAt);
    const next = new Date(firstPage.data[i + 1].createdAt);
    TestValidator.predicate(
      `todo at index ${i} should be newer than todo at index ${i + 1}`,
      () => current >= next,
    );
  }
  // 4. Test that todos from first page are properly ordered
  if (firstPage.data.length > 1) {
    const firstTodo = firstPage.data[0];
    const secondTodo = firstPage.data[1];
    // Verify creation date ordering
    TestValidator.predicate(
      "todos should be ordered by creation date (newest first)",
      () => new Date(firstTodo.createdAt) >= new Date(secondTodo.createdAt),
    );
  }
  // 5. Check that we got the expected number of todos on the first page
  TestValidator.predicate(
    "should get 20 todos on first page when 25 exist",
    () => firstPage.data.length === 20,
  );
  // 6. Test that the pagination shows correct metadata
  TestValidator.equals(
    "should show correct total records",
    firstPage.pagination.records,
    25,
  );
  TestValidator.equals(
    "should show correct total pages",
    firstPage.pagination.pages,
    2,
  );
  TestValidator.equals(
    "should show current page as 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "should show limit as 20",
    firstPage.pagination.limit,
    20,
  );
}
