import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPrivateTodoAppTodo";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import type { IPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_private_todo_app_member_todos_create } from "../../../generate/generate_random_private_todo_app_member_todos_create";
import { prepare_random_private_todo_app_todo } from "../../../prepare/prepare_random_private_todo_app_todo";

/**
 * Test that a member can filter their todo list by completion status.
 *
 * Prerequisites: Authenticate as a member and create todos with different
 * completion statuses (both completed and incomplete).
 *
 * Test Steps:
 * 1. Create multiple todo items - some completed, some incomplete
 *    - Create at least 2 completed todos (mark them as completed after creation)
 *    - Create at least 2 incomplete todos (default status)
 * 2. Request todo list with completed='all' filter - should return all todos
 * 3. Request todo list with completed='complete' filter - should return ONLY completed todos
 * 4. Verify all returned todos have completed=true when using 'complete' filter
 * 5. Request todo list with completed='incomplete' filter - should return ONLY incomplete todos
 * 6. Verify all returned todos have completed=false when using 'incomplete' filter
 * 7. Test combined filtering: apply completion filter along with sorting
 * 8. Verify the total record count in pagination metadata changes based on filter
 */
export async function test_api_todo_list_filtering_completion_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create completed todos (create then toggle to completed)
  const completedTodos = await ArrayUtil.asyncRepeat(2, async () => {
    const todo = await generate_random_private_todo_app_member_todos_create(
      memberConnection,
      {},
    );
    const toggled = await api.functional.privateTodoApp.member.todos.toggle(
      memberConnection,
      { todoId: todo.id },
    );
    typia.assert(toggled);
    return toggled;
  });
  // 3. Create incomplete todos (default status after creation)
  const incompleteTodos = await ArrayUtil.asyncRepeat(2, async () => {
    const todo = await generate_random_private_todo_app_member_todos_create(
      memberConnection,
      {},
    );
    typia.assert(todo);
    return todo;
  });
  const allTodos = [...completedTodos, ...incompleteTodos];
  // 4. Test 'all' filter - should return all todos regardless of completion
  const allTodosResult = await api.functional.privateTodoApp.member.todos.index(
    memberConnection,
    {
      body: { completed: "all" } satisfies IPrivateTodoAppTodo.IRequest,
    },
  );
  typia.assert(allTodosResult);
  TestValidator.equals(
    "all filter returns all todos",
    allTodosResult.pagination.records,
    allTodos.length,
  );
  // 5. Test 'complete' filter - should return only completed todos
  const completeTodosResult =
    await api.functional.privateTodoApp.member.todos.index(memberConnection, {
      body: { completed: "complete" } satisfies IPrivateTodoAppTodo.IRequest,
    });
  typia.assert(completeTodosResult);
  TestValidator.equals(
    "complete filter returns only completed todos",
    completeTodosResult.pagination.records,
    completedTodos.length,
  );
  TestValidator.predicate(
    "all todos in complete filter have completed=true",
    completeTodosResult.data.every((todo) => todo.completed === true),
  );
  // 6. Test 'incomplete' filter - should return only incomplete todos
  const incompleteTodosResult =
    await api.functional.privateTodoApp.member.todos.index(memberConnection, {
      body: { completed: "incomplete" } satisfies IPrivateTodoAppTodo.IRequest,
    });
  typia.assert(incompleteTodosResult);
  TestValidator.equals(
    "incomplete filter returns only incomplete todos",
    incompleteTodosResult.pagination.records,
    incompleteTodos.length,
  );
  TestValidator.predicate(
    "all todos in incomplete filter have completed=false",
    incompleteTodosResult.data.every((todo) => todo.completed === false),
  );
  // 7. Test combined filtering with sorting (incomplete + created_at desc)
  const incompleteSortedResult =
    await api.functional.privateTodoApp.member.todos.index(memberConnection, {
      body: {
        completed: "incomplete",
        sort: "created_at",
        order: "desc",
      } satisfies IPrivateTodoAppTodo.IRequest,
    });
  typia.assert(incompleteSortedResult);
  TestValidator.equals(
    "incomplete + sort filter returns correct count",
    incompleteSortedResult.pagination.records,
    incompleteTodos.length,
  );
  TestValidator.predicate(
    "sorted incomplete todos are all incomplete",
    incompleteSortedResult.data.every((todo) => todo.completed === false),
  );
  TestValidator.predicate(
    "sorted incomplete todos are in descending order by created_at",
    incompleteSortedResult.data.every(
      (todo, index) =>
        index === 0 ||
        new Date(todo.created_at) <=
          new Date(incompleteSortedResult.data[index - 1].created_at),
    ),
  );
  // 8. Verify omitted filter defaults to showing all todos
  const defaultResult = await api.functional.privateTodoApp.member.todos.index(
    memberConnection,
    {
      body: {} satisfies IPrivateTodoAppTodo.IRequest,
    },
  );
  typia.assert(defaultResult);
  TestValidator.equals(
    "omitted filter returns all todos",
    defaultResult.pagination.records,
    allTodos.length,
  );
}
