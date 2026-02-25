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

export async function test_api_todo_pagination_and_limits(
  connection: api.IConnection,
): Promise<void> {
  // User authentication and setup - use updated connection from authorization
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  // Create 20 TODOs for substantial pagination testing
  const todos = await ArrayUtil.asyncRepeat(20, async () => {
    return await generate_random_todo_app_user_todos_create(userConnection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
      } satisfies ITodoAppTodo.ICreate,
    });
  });
  // Test 1: Small limit (limit=1, page=1)
  const smallLimitResult = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(smallLimitResult);
  TestValidator.equals(
    "small limit data count",
    smallLimitResult.data.length,
    1,
  );
  TestValidator.predicate(
    "small limit pagination metadata",
    () =>
      smallLimitResult.pagination.current === 1 &&
      smallLimitResult.pagination.limit === 1 &&
      smallLimitResult.pagination.records === todos.length &&
      smallLimitResult.pagination.pages === Math.ceil(todos.length / 1),
  );
  // Test 2: Standard limit (limit=10, page=1)
  const standardResult = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(standardResult);
  TestValidator.equals(
    "standard limit data count",
    standardResult.data.length,
    10,
  );
  TestValidator.predicate(
    "standard limit pagination metadata",
    () =>
      standardResult.pagination.current === 1 &&
      standardResult.pagination.limit === 10 &&
      standardResult.pagination.records === todos.length &&
      standardResult.pagination.pages === Math.ceil(todos.length / 10),
  );
  // Test 3: Maximum boundary (limit=100)
  const maxLimitResult = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "max limit data count",
    maxLimitResult.data.length,
    todos.length,
  );
  TestValidator.predicate(
    "max limit pagination metadata",
    () =>
      maxLimitResult.pagination.current === 1 &&
      maxLimitResult.pagination.limit === 100 &&
      maxLimitResult.pagination.records === todos.length &&
      maxLimitResult.pagination.pages === 1,
  );
  // Test 4: Page beyond total pages (should return empty array with correct metadata)
  const beyondPage = Math.ceil(todos.length / 10) + 1;
  const beyondResult = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        page: beyondPage,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(beyondResult);
  TestValidator.equals("beyond page data count", beyondResult.data.length, 0);
  TestValidator.predicate(
    "beyond page pagination metadata",
    () =>
      beyondResult.pagination.current === beyondPage &&
      beyondResult.pagination.limit === 10 &&
      beyondResult.pagination.records === todos.length &&
      beyondResult.pagination.pages === Math.ceil(todos.length / 10) &&
      beyondPage > beyondResult.pagination.pages,
  );
  // Test 5: Data isolation - verify todos belong to the authorized user
  const firstTodoFromResult = maxLimitResult.data[0];
  const matchingTodo = todos.find((todo) => todo.id === firstTodoFromResult.id);
  TestValidator.predicate(
    "data isolation - todo belongs to authenticated user",
    () => matchingTodo !== undefined,
  );
}
