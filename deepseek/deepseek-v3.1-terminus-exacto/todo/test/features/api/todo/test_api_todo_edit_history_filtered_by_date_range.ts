import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistory";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoEditHistory";
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
 * Test filtering todo edit history by date range and search criteria.
 *
 * 1. Member creates a todo, makes three edits at different times
 * 2. Query history with full date range to get all edits
 * 3. Query history with narrow date range to test filtering
 * 4. Query history with search keyword to test text search
 * 5. Query history with combined date range + search criteria
 * 6. Validate pagination, empty results, and filtering accuracy
 */
export async function test_api_todo_edit_history_filtered_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create todo
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(todo);
  // 3. Make initial edit (create history entry)
  const edit1 = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: "Initial description",
      } satisfies IMultiUserTodoTodo.IUpdate,
    },
  );
  typia.assert(edit1);
  const edit1Timestamp = new Date().toISOString();
  // 4. Wait briefly for distinct timestamp
  await new Promise((resolve) => setTimeout(resolve, 10));
  // 5. Make second edit with keyword for search testing
  const edit2 = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        description: "Description containing TEST_KEYWORD for search",
      } satisfies IMultiUserTodoTodo.IUpdate,
    },
  );
  typia.assert(edit2);
  const edit2Timestamp = new Date().toISOString();
  // 6. Wait briefly for distinct timestamp
  await new Promise((resolve) => setTimeout(resolve, 10));
  // 7. Make third edit with different content
  const edit3 = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: "Third edit title",
        description: "Another description without keyword",
      } satisfies IMultiUserTodoTodo.IUpdate,
    },
  );
  typia.assert(edit3);
  const edit3Timestamp = new Date().toISOString();
  // 8. Query history with full date range (all edits)
  const fullRangeHistory =
    await api.functional.multiUserTodo.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          start_date: edit1Timestamp,
          end_date: edit3Timestamp,
          limit: 10,
          page: 1,
        } satisfies IMultiUserTodoEditHistory.IRequest,
      },
    );
  typia.assert(fullRangeHistory);
  TestValidator.equals(
    "full range should return all edits",
    fullRangeHistory.data.length,
    3,
  );
  TestValidator.predicate(
    "full range pagination records",
    fullRangeHistory.pagination.records >= 3,
  );
  // 9. Query history with narrow date range (only second edit)
  const narrowStart = new Date(Date.parse(edit2Timestamp) - 1000).toISOString();
  const narrowEnd = new Date(Date.parse(edit2Timestamp) + 1000).toISOString();
  const narrowRangeHistory =
    await api.functional.multiUserTodo.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          start_date: narrowStart,
          end_date: narrowEnd,
          limit: 10,
          page: 1,
        } satisfies IMultiUserTodoEditHistory.IRequest,
      },
    );
  typia.assert(narrowRangeHistory);
  TestValidator.equals(
    "narrow range should return only second edit",
    narrowRangeHistory.data.length,
    1,
  );
  TestValidator.predicate(
    "narrow range pagination records",
    narrowRangeHistory.pagination.records === 1,
  );
  // 10. Query history with search keyword
  const searchHistory =
    await api.functional.multiUserTodo.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          search: "TEST_KEYWORD",
          limit: 10,
          page: 1,
        } satisfies IMultiUserTodoEditHistory.IRequest,
      },
    );
  typia.assert(searchHistory);
  TestValidator.equals(
    "search should return only edits containing keyword",
    searchHistory.data.length,
    1,
  );
  TestValidator.predicate(
    "search pagination records",
    searchHistory.pagination.records === 1,
  );
  // 11. Query history with combined date range + search
  const combinedHistory =
    await api.functional.multiUserTodo.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          start_date: edit1Timestamp,
          end_date: edit3Timestamp,
          search: "TEST_KEYWORD",
          limit: 10,
          page: 1,
        } satisfies IMultiUserTodoEditHistory.IRequest,
      },
    );
  typia.assert(combinedHistory);
  TestValidator.equals(
    "combined filter should return only matching edit",
    combinedHistory.data.length,
    1,
  );
  TestValidator.predicate(
    "combined filter pagination records",
    combinedHistory.pagination.records === 1,
  );
  // 12. Test empty result scenario with impossible date range
  const futureDate = new Date(Date.now() + 86400000).toISOString();
  const emptyHistory =
    await api.functional.multiUserTodo.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          start_date: futureDate,
          end_date: futureDate,
          limit: 10,
          page: 1,
        } satisfies IMultiUserTodoEditHistory.IRequest,
      },
    );
  typia.assert(emptyHistory);
  TestValidator.equals(
    "impossible date range should return empty",
    emptyHistory.data.length,
    0,
  );
  TestValidator.equals(
    "empty result pagination records",
    emptyHistory.pagination.records,
    0,
  );
  // 13. Test pagination - verify proper handling
  const paginatedHistory =
    await api.functional.multiUserTodo.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          limit: 2,
          page: 1,
        } satisfies IMultiUserTodoEditHistory.IRequest,
      },
    );
  typia.assert(paginatedHistory);
  TestValidator.predicate(
    "first page should have limited items",
    paginatedHistory.data.length <= 2,
  );
  TestValidator.predicate(
    "pagination metadata should be accurate",
    paginatedHistory.pagination.current === 1,
  );
}
