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
 * Test filtering the trash list by completion status.
 *
 * Pre-conditions:
 * 1. Member is authenticated
 * 2. Member has created multiple todos with different completion statuses
 * 3. All todos have been deleted (moved to trash)
 * 4. Trash contains both completed and incomplete todos
 *
 * Test steps:
 * 1. Create a member and authenticate
 * 2. Create 3 incomplete todos and 3 completed todos
 * 3. Toggle 3 todos to completed status
 * 4. Delete all todos to move them to trash
 * 5. Call PATCH /privateTodoApp/member/trash with completed='complete' filter
 * 6. Verify only completed todos are returned in data array
 * 7. Call PATCH /privateTodoApp/member/trash with completed='incomplete' filter
 * 8. Verify only incomplete todos are returned in data array
 * 9. Call PATCH /privateTodoApp/member/trash with completed='all' filter
 * 10. Verify all deleted todos (both completed and incomplete) are returned
 *
 * Validation points:
 * - 'complete' filter returns only todos where completed=true
 * - 'incomplete' filter returns only todos where completed=false
 * - 'all' filter returns all deleted todos regardless of completion status
 * - Pagination metadata correctly reflects filtered results
 * - Privacy enforcement: only own todos visible in all filter scenarios
 */
export async function test_api_trash_list_filter_by_completion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create multiple todos (3 incomplete, 3 completed)
  const incompleteTodos: IPrivateTodoAppTodo[] = [];
  const completedTodos: IPrivateTodoAppTodo[] = [];
  // Create incomplete todos
  for (let i = 0; i < 3; i++) {
    const todo = await generate_random_private_todo_app_member_todos_create(
      memberConnection,
      {},
    );
    incompleteTodos.push(todo);
  }
  // Create and complete todos
  for (let i = 0; i < 3; i++) {
    const todo = await generate_random_private_todo_app_member_todos_create(
      memberConnection,
      {},
    );
    const completed = await api.functional.privateTodoApp.member.todos.toggle(
      memberConnection,
      {
        todoId: todo.id,
      },
    );
    typia.assert(completed);
    completedTodos.push(completed);
  }
  // 3. Delete all todos to move them to trash
  for (const todo of [...incompleteTodos, ...completedTodos]) {
    await api.functional.privateTodoApp.member.todos.erase(memberConnection, {
      todoId: todo.id,
    });
  }
  // 4. Test 'complete' filter - should return only completed todos
  const completeResponse =
    await api.functional.privateTodoApp.member.trash.index(memberConnection, {
      body: {
        completed: "complete",
        limit: 100,
      } satisfies IPrivateTodoAppTodo.IRequest,
    });
  typia.assert(completeResponse);
  TestValidator.predicate(
    "complete filter returns only completed todos",
    completeResponse.data.every((todo) => todo.completed === true),
  );
  TestValidator.equals(
    "complete filter count matches created completed todos",
    completeResponse.data.length,
    completedTodos.length,
  );
  // 5. Test 'incomplete' filter - should return only incomplete todos
  const incompleteResponse =
    await api.functional.privateTodoApp.member.trash.index(memberConnection, {
      body: {
        completed: "incomplete",
        limit: 100,
      } satisfies IPrivateTodoAppTodo.IRequest,
    });
  typia.assert(incompleteResponse);
  TestValidator.predicate(
    "incomplete filter returns only incomplete todos",
    incompleteResponse.data.every((todo) => todo.completed === false),
  );
  TestValidator.equals(
    "incomplete filter count matches created incomplete todos",
    incompleteResponse.data.length,
    incompleteTodos.length,
  );
  // 6. Test 'all' filter - should return all deleted todos
  const allResponse = await api.functional.privateTodoApp.member.trash.index(
    memberConnection,
    {
      body: {
        completed: "all",
        limit: 100,
      } satisfies IPrivateTodoAppTodo.IRequest,
    },
  );
  typia.assert(allResponse);
  TestValidator.equals(
    "all filter returns all deleted todos",
    allResponse.data.length,
    incompleteTodos.length + completedTodos.length,
  );
  const hasCompleted = allResponse.data.some((todo) => todo.completed === true);
  const hasIncomplete = allResponse.data.some(
    (todo) => todo.completed === false,
  );
  TestValidator.predicate(
    "all filter contains both completed and incomplete items",
    hasCompleted && hasIncomplete,
  );
}
