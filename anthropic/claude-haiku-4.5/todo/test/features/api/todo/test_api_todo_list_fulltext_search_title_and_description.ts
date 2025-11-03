import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test todo list retrieval with full-text search across title and description
 * fields.
 *
 * Validates that full-text search correctly matches partial strings in both
 * title and description fields, returns relevant results, handles
 * case-insensitive matching, and performs efficiently with GIN trigram
 * indexes.
 *
 * 1. User creates account via authentication
 * 2. First todo created with distinctive title containing "database" and
 *    description with "postgresql"
 * 3. Second todo created with different keywords "deployment" and "kubernetes"
 * 4. Third todo created with keywords "testing" and "performance"
 * 5. Search by title partial match "data" - should return first todo
 * 6. Search by title partial match "deploy" - should return second todo
 * 7. Search by description partial match "postgre" - should return first todo
 * 8. Search by description partial match "kubern" - should return second todo
 * 9. Search by title partial match "test" - should return third todo
 * 10. Verify pagination and result metadata are correct
 */
export async function test_api_todo_list_fulltext_search_title_and_description(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "TestPassword123",
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(user);
  TestValidator.equals(
    "user authentication successful",
    typeof user.id,
    "string",
  );

  // Step 2: Create first todo with "database" in title and "postgresql" in description
  const todo1: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: "Setup database configuration",
        description:
          "Configure postgresql connection with proper credentials and ssl",
        priority: "high",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1);
  TestValidator.equals(
    "first todo created",
    todo1.title,
    "Setup database configuration",
  );

  // Step 3: Create second todo with "deployment" in title and "kubernetes" in description
  const todo2: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: "Deploy application to production",
        description:
          "Use kubernetes orchestration for containerized deployment",
        priority: "high",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo2);
  TestValidator.equals(
    "second todo created",
    todo2.title,
    "Deploy application to production",
  );

  // Step 4: Create third todo with "testing" in title and "performance" in description
  const todo3: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: "Implement testing framework",
        description: "Setup performance testing with load testing scenarios",
        priority: "medium",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo3);
  TestValidator.equals(
    "third todo created",
    todo3.title,
    "Implement testing framework",
  );

  // Step 5: Search by title partial match "data" - should return first todo
  const searchByDataPartial: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        title_search: "data",
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(searchByDataPartial);
  TestValidator.predicate(
    "data search found results",
    searchByDataPartial.data.length > 0,
  );
  TestValidator.predicate(
    "data search includes first todo",
    searchByDataPartial.data.some((t) => t.id === todo1.id),
  );

  // Step 6: Search by title partial match "deploy" - should return second todo
  const searchByDeployPartial: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        title_search: "deploy",
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(searchByDeployPartial);
  TestValidator.predicate(
    "deploy search found results",
    searchByDeployPartial.data.length > 0,
  );
  TestValidator.predicate(
    "deploy search includes second todo",
    searchByDeployPartial.data.some((t) => t.id === todo2.id),
  );

  // Step 7: Search by description partial match "postgre" - should return first todo
  const searchByPostgrePartial: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        description_search: "postgre",
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(searchByPostgrePartial);
  TestValidator.predicate(
    "postgre search found results",
    searchByPostgrePartial.data.length > 0,
  );
  TestValidator.predicate(
    "postgre search includes first todo",
    searchByPostgrePartial.data.some((t) => t.id === todo1.id),
  );

  // Step 8: Search by description partial match "kubern" - should return second todo
  const searchByKubernPartial: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        description_search: "kubern",
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(searchByKubernPartial);
  TestValidator.predicate(
    "kubern search found results",
    searchByKubernPartial.data.length > 0,
  );
  TestValidator.predicate(
    "kubern search includes second todo",
    searchByKubernPartial.data.some((t) => t.id === todo2.id),
  );

  // Step 9: Search by title partial match "test" - should return third todo
  const searchByTestPartial: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        title_search: "test",
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(searchByTestPartial);
  TestValidator.predicate(
    "test search found results",
    searchByTestPartial.data.length > 0,
  );
  TestValidator.predicate(
    "test search includes third todo",
    searchByTestPartial.data.some((t) => t.id === todo3.id),
  );

  // Step 10: Verify pagination metadata is correct
  TestValidator.predicate(
    "pagination current page is valid",
    searchByTestPartial.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    searchByTestPartial.pagination.limit > 0 &&
      searchByTestPartial.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    searchByTestPartial.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    searchByTestPartial.pagination.pages >= 0,
  );

  // Additional validation: Case-insensitive search with uppercase query
  const searchByDATAUppercase: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        title_search: "DATA",
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(searchByDATAUppercase);
  TestValidator.predicate(
    "case insensitive search finds results",
    searchByDATAUppercase.data.length > 0,
  );
}
