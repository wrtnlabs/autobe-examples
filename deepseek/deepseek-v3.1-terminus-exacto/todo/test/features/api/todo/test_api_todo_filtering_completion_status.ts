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
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_filtering_completion_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://test.com",
      referrer: "https://test.com",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Update connection headers with authorization token
  userConnection.headers = {
    Authorization: authorizedUser.token.access,
  };
  // Step 2: Create test todos (all will be incomplete by default)
  const todoCount = 6;
  const todos: ITodoAppTodo[] = [];
  for (let i = 0; i < todoCount; i++) {
    const todo = await generate_random_todo_app_user_todos_create(
      userConnection,
      {
        body: {
          title: `Test Todo ${i + 1} - ${RandomGenerator.paragraph({ sentences: 1 })}`,
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    todos.push(todo);
  }
  // Step 3: Test filtering by 'all' completion status
  const allResults = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        completion_status: "all",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(allResults);
  // Should return all todos regardless of completion status
  TestValidator.equals(
    "all filter returns all todos",
    allResults.data.length,
    todoCount,
  );
  TestValidator.predicate(
    "pagination info exists",
    allResults.pagination !== undefined,
  );
  TestValidator.equals(
    "total records matches",
    allResults.pagination.records,
    todoCount,
  );
  // Step 4: Test filtering by 'complete' status (should return empty since todos are incomplete)
  const completeResults = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        completion_status: "complete",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(completeResults);
  // Should return zero completed todos (all are incomplete by default)
  TestValidator.equals(
    "complete filter returns empty for new todos",
    completeResults.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records zero for complete",
    completeResults.pagination.records,
    0,
  );
  // Step 5: Test filtering by 'incomplete' status
  const incompleteResults = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        completion_status: "incomplete",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(incompleteResults);
  // Should return all todos since they're all incomplete
  TestValidator.equals(
    "incomplete filter returns all todos",
    incompleteResults.data.length,
    todoCount,
  );
  TestValidator.equals(
    "pagination records matches",
    incompleteResults.pagination.records,
    todoCount,
  );
  // Step 6: Test pagination functionality
  const paginationResults = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        completion_status: "all",
        page: 1,
        limit: 3,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(paginationResults);
  TestValidator.equals(
    "pagination limit works",
    paginationResults.data.length,
    3,
  );
  TestValidator.predicate(
    "page calculation correct",
    paginationResults.pagination.pages >= Math.ceil(todoCount / 3),
  );
  // Step 7: Verify page 2 exists when using limit
  if (paginationResults.pagination.pages > 1) {
    const page2Results = await api.functional.todoApp.user.todos.index(
      userConnection,
      {
        body: {
          completion_status: "all",
          page: 2,
          limit: 3,
        } satisfies ITodoAppTodo.IRequest,
      },
    );
    typia.assert(page2Results);
    TestValidator.predicate("page 2 has data", page2Results.data.length > 0);
  }
}
