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

/**
 * Test todo list sorting behavior by validating the API accepts and correctly
 * handles sorting parameters.
 *
 * Since no todo creation API is available in the SDK, this test validates:
 * - Sorting parameters are accepted by the index endpoint
 * - Pagination works correctly with sorting
 * - Response structure is correct for sorted results
 */
export async function test_api_todo_list_sorting_behavior(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member user
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
  // Create member-specific connection with token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${member.token.access}` },
  };
  // 2. Test startDate ascending sort
  const startDateAscResult = await api.functional.todoApp.member.todos.index(
    authenticatedConnection,
    {
      body: {
        sortKey: "startDate",
        sortOrder: "asc",
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(startDateAscResult);
  // Verify response structure
  TestValidator.predicate(
    "startDate ascending returns valid pagination",
    startDateAscResult.pagination.pages >= 1,
  );
  TestValidator.equals(
    "startDate ascending pagination current",
    startDateAscResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "startDate ascending pagination limit",
    startDateAscResult.pagination.limit,
    20,
  );
  // 3. Test startDate descending sort
  const startDateDescResult = await api.functional.todoApp.member.todos.index(
    authenticatedConnection,
    {
      body: {
        sortKey: "startDate",
        sortOrder: "desc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(startDateDescResult);
  TestValidator.equals(
    "startDate descending pagination limit",
    startDateDescResult.pagination.limit,
    10,
  );
  // 4. Test dueDate ascending sort
  const dueDateAscResult = await api.functional.todoApp.member.todos.index(
    authenticatedConnection,
    {
      body: {
        sortKey: "dueDate",
        sortOrder: "asc",
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(dueDateAscResult);
  // 5. Test dueDate descending sort
  const dueDateDescResult = await api.functional.todoApp.member.todos.index(
    authenticatedConnection,
    {
      body: {
        sortKey: "dueDate",
        sortOrder: "desc",
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(dueDateDescResult);
  // 6. Test createdAt sort (should always be present)
  const createdAtAscResult = await api.functional.todoApp.member.todos.index(
    authenticatedConnection,
    {
      body: {
        sortKey: "createdAt",
        sortOrder: "asc",
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(createdAtAscResult);
  // Verify all todos have createdAt (required field)
  for (const todo of createdAtAscResult.data) {
    TestValidator.predicate(
      `todo ${todo.id} has createdAt`,
      todo.created_at !== undefined,
    );
  }
  // 7. Test combination of sort + filter
  const filteredSortedResult = await api.functional.todoApp.member.todos.index(
    authenticatedConnection,
    {
      body: {
        sortKey: "startDate",
        sortOrder: "asc",
        completionStatus: "incomplete",
        page: 1,
        limit: 15,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(filteredSortedResult);
  // 8. Test that sorted results are valid ITodoAppTodo.ISummary objects
  for (const todo of startDateAscResult.data) {
    typia.assert(todo);
    // Verify required fields exist
    TestValidator.predicate(
      `todo ${todo.id} has title`,
      todo.title !== undefined && todo.title.length > 0,
    );
    TestValidator.predicate(
      `todo ${todo.id} has is_complete`,
      typeof todo.is_complete === "boolean",
    );
  }
}
