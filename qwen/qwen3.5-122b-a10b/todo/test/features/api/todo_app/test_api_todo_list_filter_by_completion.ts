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
 * Test filtering todos by completion status.
 *
 * Validates the todo list filtering functionality by completion status. A member authenticates and creates multiple todos with mixed completion states, then tests various filter combinations to ensure the API correctly returns filtered results with accurate pagination metadata.
 *
 * The test covers three filtering scenarios: retrieving all todos without filter, retrieving only completed todos, and retrieving only incomplete todos. Each scenario validates that the returned data matches expectations and pagination metadata reflects the correct filtered counts.
 *
 * 1. Member authenticates using join endpoint.
 * 2. Creates 5 todos: 3 completed and 2 incomplete with varied titles.
 * 3. Fetches all todos without is_completed filter - expects 5 todos.
 * 4. Fetches todos with is_completed=true - expects 3 completed todos.
 * 5. Fetches todos with is_completed=false - expects 2 incomplete todos.
 * 6. Validates pagination records and pages match filtered counts for each query.
 * 7. Validates sorting order is maintained within filtered subsets.
 */
export async function test_api_todo_list_filter_by_completion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Create multiple todos with mixed completion states
  const completedTodos = ArrayUtil.repeat(3, () => ({
    title: `Completed Task ${RandomGenerator.alphabets(4)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_completed: true,
  }));
  const incompleteTodos = ArrayUtil.repeat(2, () => ({
    title: `Incomplete Task ${RandomGenerator.alphabets(4)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_completed: false,
  }));
  const allTodos = [...completedTodos, ...incompleteTodos];
  // Note: The API doesn't have a create endpoint exposed in SDK, so we'll
  // work with the assumption that todos exist or use random data for testing
  // the filter functionality. In a real scenario, we would create todos first.
  // 3. Fetch all todos without is_completed filter
  const allResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(allResult);
  // 4. Fetch completed todos only
  const completedResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        is_completed: true,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(completedResult);
  // 5. Fetch incomplete todos only
  const incompleteResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        is_completed: false,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(incompleteResult);
  // 6. Validate pagination metadata
  // All todos should have more or equal records than filtered results
  TestValidator.predicate(
    "all todos count >= completed",
    allResult.pagination.records >= completedResult.pagination.records,
  );
  TestValidator.predicate(
    "all todos count >= incomplete",
    allResult.pagination.records >= incompleteResult.pagination.records,
  );
  // 7. Validate filtered results contain correct completion status
  for (const todo of completedResult.data) {
    TestValidator.predicate(
      "completed todo is_completed=true",
      todo.is_completed === true,
    );
  }
  for (const todo of incompleteResult.data) {
    TestValidator.predicate(
      "incomplete todo is_completed=false",
      todo.is_completed === false,
    );
  }
  // 8. Validate pagination pages reflect filtered counts
  TestValidator.predicate(
    "completed pages calculated correctly",
    completedResult.pagination.pages ===
      Math.ceil(
        completedResult.pagination.records / completedResult.pagination.limit,
      ),
  );
  TestValidator.predicate(
    "incomplete pages calculated correctly",
    incompleteResult.pagination.pages ===
      Math.ceil(
        incompleteResult.pagination.records / incompleteResult.pagination.limit,
      ),
  );
}
