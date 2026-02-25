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
import type { ITodoAppTodoCompletion } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoCompletion";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_todo_filtering_completion_status_scenarios(connection: api.IConnection): Promise<void> {
  // Step 1: User registration and authentication
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create multiple todos with distinct titles for search testing
  const todoTitle1 = "Complete project documentation";
  const todoTitle2 = "Review code changes";
  const todoTitle3 = "Setup deployment pipeline";

  const todo1 = await generate_random_todo_app_user_todos_create(userConnection, {
    body: { title: todoTitle1 } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo1);

  const todo2 = await generate_random_todo_app_user_todos_create(userConnection, {
    body: { title: todoTitle2 } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo2);

  const todo3 = await generate_random_todo_app_user_todos_create(userConnection, {
    body: { title: todoTitle3 } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo3);

  // Step 3: Test 'all' completion status filter
  const allTodos = await api.functional.todoApp.user.filters.index(userConnection, {
    body: { completion_status: "all" } satisfies ITodoAppTodo.IRequest,
  });
  typia.assert(allTodos);
  TestValidator.equals("all todos should be returned", allTodos.data.length, 3);
  TestValidator.predicate("pagination should be correct", 
    allTodos.pagination.records === 3 && allTodos.pagination.current === 1);

  // Step 4: Test 'incomplete' completion status filter (initial state)
  const incompleteTodos = await api.functional.todoApp.user.filters.index(userConnection, {
    body: { completion_status: "incomplete" } satisfies ITodoAppTodo.IRequest,
  });
  typia.assert(incompleteTodos);
  TestValidator.equals("all 3 todos should be incomplete initially", incompleteTodos.data.length, 3);

  // Step 5: Test 'complete' completion status filter (should be empty initially)
  const completeTodosEmpty = await api.functional.todoApp.user.filters.index(userConnection, {
    body: { completion_status: "complete" } satisfies ITodoAppTodo.IRequest,
  });
  typia.assert(completeTodosEmpty);
  TestValidator.equals("no completed todos initially", completeTodosEmpty.data.length, 0);

  // Step 6: Test search functionality combined with completion status
  const searchResults = await api.functional.todoApp.user.filters.index(userConnection, {
    body: { 
      search: "project",
      completion_status: "all"
    } satisfies ITodoAppTodo.IRequest,
  });
  typia.assert(searchResults);
  TestValidator.predicate("search should find relevant todos", 
    searchResults.data.length >= 1 && searchResults.data.some(todo => todo.title.includes("project")));

  // Step 7: Verify pagination with explicit parameters
  const paginatedTodos = await api.functional.todoApp.user.filters.index(userConnection, {
    body: { 
      completion_status: "all",
      page: 1,
      limit: 2
    } satisfies ITodoAppTodo.IRequest,
  });
  typia.assert(paginatedTodos);
  TestValidator.equals("paginated results count", paginatedTodos.data.length, 2);
  TestValidator.equals("total records count", paginatedTodos.pagination.records, 3);
  TestValidator.equals("current page", paginatedTodos.pagination.current, 1);
  TestValidator.equals("page limit", paginatedTodos.pagination.limit, 2);
  TestValidator.predicate("total pages calculation", paginatedTodos.pagination.pages === 2);

  // Step 8: Verify completion status via completion endpoint
  const completion1 = await api.functional.todoApp.user.todos.completion.current(userConnection, {
    todoId: todo1.id,
  });
  typia.assert(completion1);
  TestValidator.equals("todo1 should be incomplete initially", completion1.completed, false);

  // Additional validation: Ensure data isolation by checking user ownership
  TestValidator.equals("todo1 should belong to authenticated user", todo1.user.id, user.id);
  TestValidator.equals("todo2 should belong to authenticated user", todo2.user.id, user.id);
  TestValidator.equals("todo3 should belong to authenticated user", todo3.user.id, user.id);
}