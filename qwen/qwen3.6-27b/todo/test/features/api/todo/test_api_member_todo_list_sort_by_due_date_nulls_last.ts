import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

/**
 * Test member todo list sorting by due_date with NULLS LAST behavior.
 *
 * Validates that when todos are sorted by due_date in ascending order, todos with a valid due_date appear before todos with null due_date. This NULLS LAST behavior ensures that todos without deadlines are positioned at the end of sorted results, maintaining intuitive list ordering for users.
 *
 * The test creates two todos in the same authenticated member account: one with a near-future due_date and one explicitly without a due_date. It then queries the todo list using the sort field and direction parameters, and verifies the correct ordering in the returned paginated results.
 *
 * 1. Authenticate as member using utility function
 * 2. Create first todo with near-future due_date using utility function
 * 3. Create second todo with due_date set to null using utility function
 * 4. Query todos using index endpoint with sortField='due_date' and sortDirection='asc'
 * 5. Validate that the todo with valid due_date appears before the todo with null due_date
 */
export async function test_api_member_todo_list_sort_by_due_date_nulls_last(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  // 2. Create first todo with near-future due_date
  const todoWithDueDate = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoWithDueDate);
  // 3. Create second todo with due_date set to null
  const todoWithoutDueDate = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        due_date: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoWithoutDueDate);
  // 4. Query todos sorted by due_date ascending
  const request = {
    sortField: "due_date" as const,
    sortDirection: "asc" as const,
  } satisfies ITodoAppTodo.IRequest;
  const result = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: request,
    },
  );
  typia.assert(result);
  // 5. Validate NULLS LAST behavior
  // The todos with valid due_date should appear before todos with null due_date
  TestValidator.predicate(
    "result contains at least the two created todos",
    result.data.length >= 2,
  );
  // Find our two todos in the result
  const foundWithDueDate = result.data.find(
    (todo) => todo.id === todoWithDueDate.id,
  );
  const foundWithoutDueDate = result.data.find(
    (todo) => todo.id === todoWithoutDueDate.id,
  );
  TestValidator.predicate(
    "todo with due_date exists in results",
    foundWithDueDate !== undefined,
  );
  TestValidator.predicate(
    "todo without due_date exists in results",
    foundWithoutDueDate !== undefined,
  );
  // Validate the sorting: the todo with due_date appears before the todo without due_date
  const indexOfTodoWithDueDate = result.data.findIndex(
    (todo) => todo.id === todoWithDueDate.id,
  );
  const indexOfTodoWithoutDueDate = result.data.findIndex(
    (todo) => todo.id === todoWithoutDueDate.id,
  );
  TestValidator.predicate(
    "NULLS LAST: todo with due_date appears before todo with null due_date",
    indexOfTodoWithDueDate < indexOfTodoWithoutDueDate,
  );
  // Also validate the due_date values directly
  TestValidator.predicate(
    "found todo with due_date has a valid due_date",
    foundWithDueDate!.due_date !== null,
  );
  TestValidator.equals(
    "found todo without due_date has null due_date",
    foundWithoutDueDate!.due_date,
    null,
  );
}