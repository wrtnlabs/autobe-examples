import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
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

export async function test_api_todo_list_filtering_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Define date constants for test data
  const now = new Date();
  const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 1 week ago
  const nearFutureDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
  const farFutureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
  // 3. Create Todo A: 'Buy groceries', no due date, not completed
  const todoA = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Buy groceries",
        due_at: null,
      },
    },
  );
  typia.assert(todoA);
  // 4. Create Todo B: 'Write report', near future due date, not completed
  const todoB = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Write report",
        due_at: nearFutureDate.toISOString(),
      },
    },
  );
  typia.assert(todoB);
  // 5. Create Todo C: 'Send email', far future due date (will be completed)
  const todoC = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Send email",
        due_at: farFutureDate.toISOString(),
      },
    },
  );
  typia.assert(todoC);
  // 6. Create Todo D: 'Call dentist', past due date, not completed
  const todoD = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Call dentist",
        due_at: pastDate.toISOString(),
      },
    },
  );
  typia.assert(todoD);
  // 7. Mark Todo C as complete
  const completedC = await api.functional.todoApp.member.todos.complete(
    memberConnection,
    {
      todoId: todoC.id,
    },
  );
  typia.assert(completedC);
  TestValidator.equals(
    "Todo C is_completed after complete",
    completedC.is_completed,
    true,
  );
  // ====== Test 1: Filter incomplete todos, sort by dueAt asc ======
  const incompleteAsc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        completionStatus: "incomplete",
        sortBy: "dueAt",
        sortDirection: "asc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(incompleteAsc);
  // Verify only 3 incomplete todos returned
  TestValidator.equals(
    "incomplete filter: records count",
    incompleteAsc.pagination.records,
    3,
  );
  TestValidator.equals(
    "incomplete filter: current page",
    incompleteAsc.pagination.current,
    1,
  );
  TestValidator.equals(
    "incomplete filter: data length",
    incompleteAsc.data.length,
    3,
  );
  // Verify all returned todos are not completed
  for (const todo of incompleteAsc.data) {
    TestValidator.equals(
      `todo ${todo.title} is_completed should be false`,
      todo.is_completed,
      false,
    );
  }
  // Verify todo C is NOT in the incomplete list
  const incompleteTodoIds = incompleteAsc.data.map((t) => t.id);
  TestValidator.predicate(
    "todo C should not be in incomplete list",
    !incompleteTodoIds.includes(todoC.id),
  );
  // Verify order: D (past) first, B (near future) second, A (no due date) last (nulls last)
  TestValidator.equals(
    "1st incomplete todo should be D (past date)",
    incompleteAsc.data[0]!.id,
    todoD.id,
  );
  TestValidator.equals(
    "2nd incomplete todo should be B (near future)",
    incompleteAsc.data[1]!.id,
    todoB.id,
  );
  TestValidator.equals(
    "3rd incomplete todo should be A (no due date, nulls last)",
    incompleteAsc.data[2]!.id,
    todoA.id,
  );
  // ====== Test 2: Filter completed todos ======
  const completedFilter = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        completionStatus: "completed",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(completedFilter);
  // Verify only 1 completed todo returned
  TestValidator.equals(
    "completed filter: records count",
    completedFilter.pagination.records,
    1,
  );
  TestValidator.equals(
    "completed filter: data length",
    completedFilter.data.length,
    1,
  );
  TestValidator.equals(
    "completed filter: todo C returned",
    completedFilter.data[0]!.id,
    todoC.id,
  );
  TestValidator.equals(
    "completed filter: is_completed is true",
    completedFilter.data[0]!.is_completed,
    true,
  );
  // ====== Test 3: Filter all todos ======
  const allFilter = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        completionStatus: "all",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(allFilter);
  // Verify all 4 todos returned
  TestValidator.equals(
    "all filter: records count",
    allFilter.pagination.records,
    4,
  );
  TestValidator.equals("all filter: data length", allFilter.data.length, 4);
  // ====== Test 4: All filter + dueAt desc sort (nulls last) ======
  const allDesc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        completionStatus: "all",
        sortBy: "dueAt",
        sortDirection: "desc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(allDesc);
  // Verify 4 todos returned
  TestValidator.equals(
    "all desc filter: records count",
    allDesc.pagination.records,
    4,
  );
  TestValidator.equals("all desc filter: data length", allDesc.data.length, 4);
  // Verify order desc: C (far future), B (near future), D (past), A (no due date) last (nulls last regardless of direction)
  TestValidator.equals(
    "1st in desc should be C (far future)",
    allDesc.data[0]!.id,
    todoC.id,
  );
  TestValidator.equals(
    "2nd in desc should be B (near future)",
    allDesc.data[1]!.id,
    todoB.id,
  );
  TestValidator.equals(
    "3rd in desc should be D (past)",
    allDesc.data[2]!.id,
    todoD.id,
  );
  TestValidator.equals(
    "4th in desc should be A (no due date, nulls last)",
    allDesc.data[3]!.id,
    todoA.id,
  );
}
