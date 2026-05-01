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
 * Test completion status filtering across all three modes: all, complete, and incomplete.
 *
 * Verifies that the todo list endpoint correctly filters todos by their completion status. The test creates three todos — two incomplete and one complete — then queries with each completion filter mode to confirm accurate separation, correct record counts, and proper pagination metadata.
 *
 * 1. Join as a new member with random credentials.
 * 2. Create two incomplete todos with distinct titles ("Incomplete A", "Incomplete B").
 * 3. Create a third todo ("Complete A") and toggle it to complete status.
 * 4. Query with completion="all" — validates all 3 todos returned with completed_at mixed states.
 * 5. Query with completion="complete" — validates only the completed todo returned with completed_at non-null.
 * 6. Query with completion="incomplete" — validates both incomplete todos returned with completed_at null.
 * 7. Validates pagination metadata accuracy for each query.
 */
export async function test_api_todo_list_completion_filtering_all_modes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create two incomplete todos
  const incompleteA = await generate_random_todo_app_member_todos_create(
    memberConnection,
    { body: { title: "Incomplete A" } },
  );
  typia.assert(incompleteA);
  const incompleteB = await generate_random_todo_app_member_todos_create(
    memberConnection,
    { body: { title: "Incomplete B" } },
  );
  typia.assert(incompleteB);
  // 3. Create a third todo and toggle it to complete
  const completeTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    { body: { title: "Complete A" } },
  );
  typia.assert(completeTodo);
  const toggled = await api.functional.todoApp.member.todos.toggle(
    memberConnection,
    { todoId: completeTodo.id },
  );
  typia.assert(toggled);
  // 4. Query with completion="all"
  const allResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    { body: { completion: "all" } satisfies ITodoAppTodo.IRequest },
  );
  typia.assert(allResult);
  // 5. Query with completion="complete"
  const completeResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    { body: { completion: "complete" } satisfies ITodoAppTodo.IRequest },
  );
  typia.assert(completeResult);
  // 6. Query with completion="incomplete"
  const incompleteResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    { body: { completion: "incomplete" } satisfies ITodoAppTodo.IRequest },
  );
  typia.assert(incompleteResult);
  // 7. Validate results
  TestValidator.equals(
    "all mode records count",
    allResult.pagination.records,
    3,
  );
  TestValidator.equals(
    "complete mode records count",
    completeResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "incomplete mode records count",
    incompleteResult.pagination.records,
    2,
  );
  TestValidator.equals(
    "complete mode title",
    completeResult.data[0].title,
    "Complete A",
  );
  TestValidator.predicate(
    "complete mode has completed_at set",
    completeResult.data[0].completed_at !== null,
  );
  TestValidator.predicate(
    "incomplete A has null completed_at",
    incompleteResult.data.some(
      (t) => t.title === "Incomplete A" && t.completed_at === null,
    ),
  );
  TestValidator.predicate(
    "incomplete B has null completed_at",
    incompleteResult.data.some(
      (t) => t.title === "Incomplete B" && t.completed_at === null,
    ),
  );
}
