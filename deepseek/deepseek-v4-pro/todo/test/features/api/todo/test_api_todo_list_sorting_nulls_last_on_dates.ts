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
 * Test that sorting by start_date and due_date places null-dated todos last regardless of direction.
 *
 * Verifies the NULLS LAST sorting behavior for both start_date and due_date fields. Todos without a date value always appear at the end of the paginated list, whether sorting ascending or descending. Todos with dates are ordered correctly by their date values.
 *
 * 1. Join as a new member and authenticate.
 * 2. Create a todo with start_date set to May 2026.
 * 3. Create a todo without a start_date (null).
 * 4. Create a todo with start_date set to April 2026 (earlier).
 * 5. Create a todo with a due_date set to June 2026.
 * 6. Create a todo without a due_date (null).
 * 7. Sort by start_date ascending: verify order is April → May → null last.
 * 8. Sort by start_date descending: verify order is May → April → null last.
 * 9. Sort by due_date ascending: verify dated todo first, null last.
 * 10. Sort by due_date descending: verify dated todo first, null last.
 */
export async function test_api_todo_list_sorting_nulls_last_on_dates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Define test dates
  const aprilDate = "2026-04-01T00:00:00.000Z";
  const mayDate = "2026-05-01T00:00:00.000Z";
  const juneDate = "2026-06-01T00:00:00.000Z";
  // 2. Create todo with start_date = May 2026
  const todoMayStart = await generate_random_todo_app_member_todos_create(
    memberConnection,
    { body: { start_date: mayDate } },
  );
  // 3. Create todo without start_date (null)
  const todoNoStart = await generate_random_todo_app_member_todos_create(
    memberConnection,
    { body: { start_date: null } },
  );
  // 4. Create todo with start_date = April 2026
  const todoAprilStart = await generate_random_todo_app_member_todos_create(
    memberConnection,
    { body: { start_date: aprilDate } },
  );
  // 5. Create todo with due_date = June 2026
  const todoWithDue = await generate_random_todo_app_member_todos_create(
    memberConnection,
    { body: { due_date: juneDate } },
  );
  // 6. Create todo without due_date (null)
  const todoNoDue = await generate_random_todo_app_member_todos_create(
    memberConnection,
    { body: { due_date: null } },
  );
  // Helper: retrieve sorted page and extract IDs
  const fetchSortedIds = async (
    sort: "start_date" | "due_date",
    direction: "asc" | "desc",
  ): Promise<string[]> => {
    const result = await api.functional.todoApp.member.todos.index(
      memberConnection,
      {
        body: {
          sort,
          direction,
          limit: 100,
        } satisfies ITodoAppTodo.IRequest,
      },
    );
    typia.assert(result);
    return result.data.map((t) => t.id);
  };
  // 7. Sort by start_date ASC → April, May, null last
  const startAscIds = await fetchSortedIds("start_date", "asc");
  TestValidator.equals(
    "start_date asc: first is April",
    startAscIds[0],
    todoAprilStart.id,
  );
  TestValidator.equals(
    "start_date asc: second is May",
    startAscIds[1],
    todoMayStart.id,
  );
  TestValidator.equals(
    "start_date asc: null-start_date todo is last",
    startAscIds[startAscIds.length - 1],
    todoNoStart.id,
  );
  // 8. Sort by start_date DESC → May, April, null last
  const startDescIds = await fetchSortedIds("start_date", "desc");
  TestValidator.equals(
    "start_date desc: first is May",
    startDescIds[0],
    todoMayStart.id,
  );
  TestValidator.equals(
    "start_date desc: second is April",
    startDescIds[1],
    todoAprilStart.id,
  );
  TestValidator.equals(
    "start_date desc: null-start_date todo is last",
    startDescIds[startDescIds.length - 1],
    todoNoStart.id,
  );
  // 9. Sort by due_date ASC → dated todo first, null last
  const dueAscIds = await fetchSortedIds("due_date", "asc");
  TestValidator.equals(
    "due_date asc: first is dated todo",
    dueAscIds[0],
    todoWithDue.id,
  );
  TestValidator.equals(
    "due_date asc: null-due_date todo is last",
    dueAscIds[dueAscIds.length - 1],
    todoNoDue.id,
  );
  // 10. Sort by due_date DESC → dated todo first, null last
  const dueDescIds = await fetchSortedIds("due_date", "desc");
  TestValidator.equals(
    "due_date desc: first is dated todo",
    dueDescIds[0],
    todoWithDue.id,
  );
  TestValidator.equals(
    "due_date desc: null-due_date todo is last",
    dueDescIds[dueDescIds.length - 1],
    todoNoDue.id,
  );
  // Verify pagination metadata is accurate
  const finalResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(finalResult);
  TestValidator.predicate(
    "pagination records count is at least 5",
    finalResult.pagination.records >= 5,
  );
}
