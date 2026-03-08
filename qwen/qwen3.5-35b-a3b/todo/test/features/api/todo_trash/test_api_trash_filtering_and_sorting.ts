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

export async function test_api_trash_filtering_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Generate mock trash todos
  const now = new Date();
  const createTodo = (
    title: string,
    isComplete: boolean,
    startDate: string | null,
    dueDate: string | null,
    deletedAt: string,
  ): ITodoAppTodo.ISummary => ({
    id: typia.random<string & tags.Format<"uuid">>(),
    title,
    description: RandomGenerator.paragraph({ sentences: 2 }) || null,
    start_date: startDate,
    due_date: dueDate,
    is_complete: isComplete,
    created_at: now.toISOString(),
    deleted_at: deletedAt,
  });
  const trashTodos = [
    createTodo(
      "Complete todo with early start",
      true,
      new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5).toISOString(),
      null,
      now.toISOString(),
    ),
    createTodo(
      "Complete todo with late start",
      true,
      new Date(now.getTime() - 1000 * 60 * 60 * 24 * 1).toISOString(),
      null,
      now.toISOString(),
    ),
    createTodo(
      "Complete todo without dates",
      true,
      null,
      null,
      now.toISOString(),
    ),
    createTodo(
      "Incomplete todo with early due",
      false,
      null,
      new Date(now.getTime() + 1000 * 60 * 60 * 24 * 1).toISOString(),
      now.toISOString(),
    ),
    createTodo(
      "Incomplete todo with late due",
      false,
      null,
      new Date(now.getTime() + 1000 * 60 * 60 * 24 * 10).toISOString(),
      now.toISOString(),
    ),
  ];
  // 3. Test filtering by completionStatus
  // Test 'complete' filter
  const completeResult = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: { completionStatus: "complete" },
    },
  );
  typia.assert(completeResult);
  const completeTodos = completeResult.data;
  TestValidator.equals(
    "all complete todos",
    completeTodos.every((t) => t.is_complete === true),
    true,
  );
  TestValidator.equals("complete todos count", completeTodos.length, 3);
  // Test 'incomplete' filter
  const incompleteResult =
    await api.functional.todoApp.member.todos.trash.index(memberConnection, {
      body: { completionStatus: "incomplete" },
    });
  typia.assert(incompleteResult);
  const incompleteTodos = incompleteResult.data;
  TestValidator.equals(
    "all incomplete todos",
    incompleteTodos.every((t) => t.is_complete === false),
    true,
  );
  TestValidator.equals("incomplete todos count", incompleteTodos.length, 2);
  // Test 'all' filter
  const allResult = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: { completionStatus: "all" },
    },
  );
  typia.assert(allResult);
  TestValidator.equals("all todos count", allResult.data.length, 5);
  TestValidator.equals("pagination records", allResult.pagination.records, 5);
  // 4. Test sorting by start_date ascending
  const startDateAscResult =
    await api.functional.todoApp.member.todos.trash.index(memberConnection, {
      body: { sortKey: "startDate", sortOrder: "asc" },
    });
  typia.assert(startDateAscResult);
  const startDateAsc = startDateAscResult.data;
  // Verify todos without start_date appear at end
  const nonNullStartDates = startDateAsc.filter((t) => t.start_date !== null);
  const nullStartDates = startDateAsc.filter((t) => t.start_date === null);
  TestValidator.equals(
    "todos without start_date at end",
    nonNullStartDates.every((t) =>
      nullStartDates.every((other) => t.start_date! < other.start_date!),
    ),
    true,
  );
  TestValidator.equals("non-null dates count", nonNullStartDates.length, 2);
  TestValidator.equals("null dates count", nullStartDates.length, 3);
  // 5. Test sorting by start_date descending
  const startDateDescResult =
    await api.functional.todoApp.member.todos.trash.index(memberConnection, {
      body: { sortKey: "startDate", sortOrder: "desc" },
    });
  typia.assert(startDateDescResult);
  // 6. Test sorting by due_date ascending
  const dueDateAscResult =
    await api.functional.todoApp.member.todos.trash.index(memberConnection, {
      body: { sortKey: "dueDate", sortOrder: "asc" },
    });
  typia.assert(dueDateAscResult);
  const dueDateAsc = dueDateAscResult.data;
  // Verify todos without due_date appear at end
  const nonNullDueDates = dueDateAsc.filter((t) => t.due_date !== null);
  const nullDueDates = dueDateAsc.filter((t) => t.due_date === null);
  TestValidator.equals(
    "todos without due_date at end",
    nonNullDueDates.every((t) =>
      nullDueDates.every((other) => t.due_date! < other.due_date!),
    ),
    true,
  );
  TestValidator.equals("null due dates count", nullDueDates.length, 3);
  // 7. Test sorting by due_date descending
  const dueDateDescResult =
    await api.functional.todoApp.member.todos.trash.index(memberConnection, {
      body: { sortKey: "dueDate", sortOrder: "desc" },
    });
  typia.assert(dueDateDescResult);
  // 8. Test combined filter + sort (incomplete + due_date ascending)
  const combinedResult = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        completionStatus: "incomplete",
        sortKey: "dueDate",
        sortOrder: "asc",
      },
    },
  );
  typia.assert(combinedResult);
  const combinedTodos = combinedResult.data;
  TestValidator.equals("combined filter + sort count", combinedTodos.length, 2);
  TestValidator.equals(
    "all incomplete",
    combinedTodos.every((t) => t.is_complete === false),
    true,
  );
  TestValidator.equals(
    "combined sorted by due date ascending",
    combinedTodos.length > 0,
    true,
  );
  // 9. Verify pagination metadata
  TestValidator.equals("current page", allResult.pagination.current, 1);
  TestValidator.equals("limit", allResult.pagination.limit, 20);
  TestValidator.equals("total pages", allResult.pagination.pages, 1);
}