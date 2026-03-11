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

export async function test_api_todo_list_completion_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create multiple todos with mixed states
  // Create 3 incomplete todos (default completed=false)
  const incompleteTodos: ITodoAppTodo[] = await Promise.all(
    ArrayUtil.repeat(
      3,
      async (index) => {
        const todo = await generate_random_todo_app_member_todos_create(
          memberConnection,
          {
            body: {
              title: `Incomplete Todo ${index + 1} - ${RandomGenerator.paragraph({ sentences: 1 })}`,
              description: RandomGenerator.content({ paragraphs: 1 }),
            } satisfies ITodoAppTodo.ICreate,
          },
        );
        typia.assert(todo);
        return todo;
      },
    ),
  );
  // 3. Test filter with completed=false (incomplete todos)
  const incompleteFilterResult =
    await api.functional.todoApp.member.todos.index(memberConnection, {
      body: {
        completed: false,
        deleted: false,
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(incompleteFilterResult);
  // Verify all returned todos are incomplete
  TestValidator.predicate("all filtered todos are incomplete", () =>
    incompleteFilterResult.data.every((todo) => todo.completed === false),
  );
  TestValidator.equals(
    "incomplete count matches",
    incompleteFilterResult.pagination.records,
    incompleteTodos.length,
  );
  // 4. Test filter with completed=true (completed todos - edge case: none exist)
  const completedFilterResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        completed: true,
        deleted: false,
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(completedFilterResult);
  // Verify empty result for completed filter (no completed todos exist)
  TestValidator.predicate("all filtered todos are completed", () =>
    completedFilterResult.data.every((todo) => todo.completed === true),
  );
  TestValidator.equals(
    "completed count is zero",
    completedFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "completed pages is zero",
    completedFilterResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "completed data array is empty",
    completedFilterResult.data.length,
    0,
  );
  // 5. Test filter without completed parameter (all todos)
  const allTodosResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        deleted: false,
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(allTodosResult);
  // Verify we get all todos when no completion filter is applied
  TestValidator.equals(
    "total count matches all created todos",
    allTodosResult.pagination.records,
    incompleteTodos.length,
  );
  TestValidator.equals(
    "all todos returned",
    allTodosResult.data.length,
    incompleteTodos.length,
  );
  // 6. Verify pagination metadata for all results
  TestValidator.predicate(
    "current page is valid",
    () => allTodosResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is valid",
    () => allTodosResult.pagination.limit > 0,
  );
  TestValidator.equals(
    "records match data length",
    allTodosResult.pagination.records,
    allTodosResult.data.length,
  );
  // 7. Verify all todos in unfiltered result are active (not deleted)
  TestValidator.predicate("all todos are active (not deleted)", () =>
    allTodosResult.data.every((todo) => todo.deleted_at === null),
  );
}