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
 * Test the edge case where filtering by completion status returns empty results.
 * A member should be able to:
 * 1. Create todos with specific completion statuses (e.g., only complete todos)
 * 2. Filter the todo list by the opposite completion status (e.g., filter for incomplete)
 * 3. Verify the response returns an empty data array with correct pagination metadata
 * 4. Test with different sort options on empty results
 * 5. Verify that search text filtering also returns empty results
 */
export async function test_api_todo_list_empty_results_with_completion_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Create todos (they will have completed=false by default)
  const todo1 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1);
  const todo2 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo2);
  // 3. Filter for complete todos (should return empty since all created todos are incomplete)
  const completeFilterResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        completed: "complete",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(completeFilterResult);
  // 4. Verify empty results with correct pagination metadata
  TestValidator.equals(
    "complete filter - data array empty",
    completeFilterResult.data.length,
    0,
  );
  TestValidator.equals(
    "complete filter - records count",
    completeFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "complete filter - pages count",
    completeFilterResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "complete filter - current page",
    completeFilterResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "complete filter - limit",
    completeFilterResult.pagination.limit,
    10,
  );
  // 5. Test with different sort options on empty results
  const sortByCreatedAtResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        completed: "complete",
        sortBy: "createdAt",
        sortOrder: "desc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortByCreatedAtResult);
  TestValidator.equals(
    "sort by createdAt - data array empty",
    sortByCreatedAtResult.data.length,
    0,
  );
  TestValidator.equals(
    "sort by createdAt - records count",
    sortByCreatedAtResult.pagination.records,
    0,
  );
  const sortByDueDateResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        completed: "complete",
        sortBy: "dueDate",
        sortOrder: "asc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortByDueDateResult);
  TestValidator.equals(
    "sort by dueDate - data array empty",
    sortByDueDateResult.data.length,
    0,
  );
  TestValidator.equals(
    "sort by dueDate - records count",
    sortByDueDateResult.pagination.records,
    0,
  );
  // 6. Test search text filtering returns empty results
  const searchResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        completed: "all",
        search: "nonexistent_search_text_xyz123",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.equals(
    "search filter - data array empty",
    searchResult.data.length,
    0,
  );
  TestValidator.equals(
    "search filter - records count",
    searchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "search filter - pages count",
    searchResult.pagination.pages,
    0,
  );
  // 7. Verify incomplete todos exist when filtering for incomplete
  const incompleteFilterResult =
    await api.functional.todoApp.member.todos.index(memberConnection, {
      body: {
        completed: "incomplete",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(incompleteFilterResult);
  TestValidator.equals(
    "incomplete filter - records count matches created",
    incompleteFilterResult.pagination.records,
    2,
  );
  TestValidator.predicate(
    "incomplete filter - data array not empty",
    incompleteFilterResult.data.length > 0,
  );
}
