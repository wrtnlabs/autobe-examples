import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoTrashEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoTrashEntry";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodoTrashEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodoTrashEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

/**
 * Test the scenario where a member filters their trash by deletion date ranges.
 * This validates the date filtering functionality for trash management:
 *
 * 1. Authenticate as a member user
 * 2. Create and soft-delete todos at different timestamps to create a date distribution
 * 3. Call the trash entries endpoint with specific date range filters (deleted_at_start and deleted_at_end)
 * 4. Validate the response contains only trash entries within the specified date range
 * 5. Verify the pagination metadata accurately reflects the filtered results
 * 6. Test edge cases like empty date ranges and single-day filters
 */
export async function test_api_trash_view_date_filtered_entries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  typia.assert(authorizedMember);
  // 2. Create multiple todos with sequential timing
  const todos = await ArrayUtil.asyncRepeat(5, async (index) => {
    const todo = await generate_random_multi_user_todo_member_todos_create(
      memberConnection,
      {
        body: {
          title: `Test Todo ${index + 1} for Date Filtering`,
          description: `This is test todo ${index + 1} created for date filtering validation`,
        } satisfies IMultiUserTodoTodo.ICreate,
      },
    );
    typia.assert(todo);
    return todo;
  });
  // 3. Establish temporal distribution by controlling deletion times
  // We'll use Date objects with specific offsets to create distinct time ranges
  const baseTime = new Date();
  // Simulate different deletion times by waiting briefly between deletions
  const deletedTodos: Array<{
    todo: IMultiUserTodoTodo;
    deletedAt: Date;
  }> = [];
  // Delete first 2 todos immediately (early time range)
  for (let i = 0; i < 2; i++) {
    await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
      todoId: todos[i].id,
    });
    deletedTodos.push({ todo: todos[i], deletedAt: new Date() });
  }
  // Wait a moment to create time gap
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Delete next 2 todos (middle time range)
  for (let i = 2; i < 4; i++) {
    await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
      todoId: todos[i].id,
    });
    deletedTodos.push({ todo: todos[i], deletedAt: new Date() });
  }
  // Wait another moment
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Delete last todo (late time range)
  await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
    todoId: todos[4].id,
  });
  deletedTodos.push({ todo: todos[4], deletedAt: new Date() });
  // 4. Define date ranges based on actual deletion times
  // Early range: first two deletions
  const earlyStart = deletedTodos[0].deletedAt.toISOString();
  const earlyEnd = deletedTodos[1].deletedAt.toISOString();
  // Middle range: middle two deletions
  const middleStart = deletedTodos[2].deletedAt.toISOString();
  const middleEnd = deletedTodos[3].deletedAt.toISOString();
  // Late range: last deletion (single day filter)
  const lateTime = deletedTodos[4].deletedAt.toISOString();
  // Complete range covering all deletions
  const completeStart = deletedTodos[0].deletedAt.toISOString();
  const completeEnd = deletedTodos[4].deletedAt.toISOString();
  // 5. Test early date range filter
  const earlyRangeResponse =
    await api.functional.multiUserTodo.member.todos.trash_entries.index(
      memberConnection,
      {
        body: {
          deleted_at_start: earlyStart,
          deleted_at_end: earlyEnd,
          limit: 10,
          page: 1,
        } satisfies IMultiUserTodoTodoTrashEntry.IRequest,
      },
    );
  typia.assert(earlyRangeResponse);
  // Should contain only first two todos
  TestValidator.equals("early range count", earlyRangeResponse.data.length, 2);
  TestValidator.predicate(
    "early range pagination records",
    earlyRangeResponse.pagination.records === 2,
  );
  // Verify each todo is within the early range
  for (const entry of earlyRangeResponse.data) {
    const deletedAt = new Date(entry.deleted_at);
    const start = new Date(earlyStart);
    const end = new Date(earlyEnd);
    TestValidator.predicate(
      "deleted_at within early range",
      deletedAt >= start && deletedAt <= end,
    );
  }
  // 6. Test middle date range filter
  const middleRangeResponse =
    await api.functional.multiUserTodo.member.todos.trash_entries.index(
      memberConnection,
      {
        body: {
          deleted_at_start: middleStart,
          deleted_at_end: middleEnd,
          limit: 10,
          page: 1,
        } satisfies IMultiUserTodoTodoTrashEntry.IRequest,
      },
    );
  typia.assert(middleRangeResponse);
  // Should contain only middle two todos
  TestValidator.equals(
    "middle range count",
    middleRangeResponse.data.length,
    2,
  );
  TestValidator.predicate(
    "middle range pagination records",
    middleRangeResponse.pagination.records === 2,
  );
  // 7. Test late date range (single day filter)
  const lateRangeResponse =
    await api.functional.multiUserTodo.member.todos.trash_entries.index(
      memberConnection,
      {
        body: {
          deleted_at_start: lateTime,
          deleted_at_end: lateTime,
          limit: 10,
          page: 1,
        } satisfies IMultiUserTodoTodoTrashEntry.IRequest,
      },
    );
  typia.assert(lateRangeResponse);
  // Should contain only the last todo
  TestValidator.equals("late range count", lateRangeResponse.data.length, 1);
  TestValidator.predicate(
    "late range pagination records",
    lateRangeResponse.pagination.records === 1,
  );
  TestValidator.equals(
    "late range todo id matches",
    lateRangeResponse.data[0].todo.id,
    deletedTodos[4].todo.id,
  );
  // 8. Test complete date range (all todos)
  const completeRangeResponse =
    await api.functional.multiUserTodo.member.todos.trash_entries.index(
      memberConnection,
      {
        body: {
          deleted_at_start: completeStart,
          deleted_at_end: completeEnd,
          limit: 10,
          page: 1,
        } satisfies IMultiUserTodoTodoTrashEntry.IRequest,
      },
    );
  typia.assert(completeRangeResponse);
  // Should contain all 5 todos
  TestValidator.equals(
    "complete range count",
    completeRangeResponse.data.length,
    5,
  );
  TestValidator.predicate(
    "complete range pagination records",
    completeRangeResponse.pagination.records === 5,
  );
  // 9. Test edge case: date range with no results (future date)
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const emptyRangeResponse =
    await api.functional.multiUserTodo.member.todos.trash_entries.index(
      memberConnection,
      {
        body: {
          deleted_at_start: futureDate,
          deleted_at_end: futureDate,
          limit: 10,
          page: 1,
        } satisfies IMultiUserTodoTodoTrashEntry.IRequest,
      },
    );
  typia.assert(emptyRangeResponse);
  // Should return empty data array
  TestValidator.equals("empty range count", emptyRangeResponse.data.length, 0);
  TestValidator.predicate(
    "empty range pagination records",
    emptyRangeResponse.pagination.records === 0,
  );
  TestValidator.predicate(
    "empty range pages",
    emptyRangeResponse.pagination.pages === 0,
  );
  // 10. Verify business logic: trash entries should have null restored_at and permanently_deleted_at
  for (const response of [
    earlyRangeResponse,
    middleRangeResponse,
    lateRangeResponse,
    completeRangeResponse,
  ]) {
    for (const entry of response.data) {
      TestValidator.predicate(
        "restored_at is null",
        entry.restored_at === null,
      );
      TestValidator.predicate(
        "permanently_deleted_at is null",
        entry.permanently_deleted_at === null,
      );
      TestValidator.predicate(
        "todo summary has required fields",
        entry.todo.id !== undefined &&
          entry.todo.title !== undefined &&
          entry.todo.created_at !== undefined,
      );
    }
  }
}
