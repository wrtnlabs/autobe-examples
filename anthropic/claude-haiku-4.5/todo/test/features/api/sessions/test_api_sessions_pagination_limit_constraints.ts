import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListSession";
import type { ITodoListSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSession";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test pagination limit boundaries for session search API.
 *
 * Validates that the session list endpoint correctly handles pagination limit
 * constraints with minimum value of 1 and maximum value of 100. Tests boundary
 * conditions by providing valid limit values to verify the API returns
 * appropriate data.
 *
 * Steps:
 *
 * 1. Register a new user to establish authentication
 * 2. Request with default limit (omitted), verify pagination response
 * 3. Request with limit=1 (minimum valid boundary), verify single session per page
 * 4. Request with limit=100 (maximum valid boundary), verify up to 100 returned
 */
export async function test_api_sessions_pagination_limit_constraints(
  connection: api.IConnection,
) {
  // Step 1: Register user
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Test default limit (omitted)
  const resultDefault: IPageITodoListSession.ISummary =
    await api.functional.todoList.user.auth.user.sessions.index(connection, {
      body: {
        page: 1,
      } satisfies ITodoListSession.IRequest,
    });
  typia.assert(resultDefault);
  TestValidator.predicate(
    "default pagination should return valid pagination info",
    resultDefault.pagination.limit > 0,
  );

  // Step 3: Test valid limit=1 (minimum valid boundary)
  const resultLimit1: IPageITodoListSession.ISummary =
    await api.functional.todoList.user.auth.user.sessions.index(connection, {
      body: {
        page: 1,
        limit: 1,
      } satisfies ITodoListSession.IRequest,
    });
  typia.assert(resultLimit1);
  TestValidator.predicate(
    "limit=1 should return at most 1 session per page",
    resultLimit1.data.length <= 1,
  );
  TestValidator.equals(
    "pagination limit should be 1",
    resultLimit1.pagination.limit,
    1,
  );

  // Step 4: Test valid limit=100 (maximum valid boundary)
  const resultLimit100: IPageITodoListSession.ISummary =
    await api.functional.todoList.user.auth.user.sessions.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoListSession.IRequest,
    });
  typia.assert(resultLimit100);
  TestValidator.predicate(
    "limit=100 should return at most 100 sessions per page",
    resultLimit100.data.length <= 100,
  );
  TestValidator.equals(
    "pagination limit should be 100",
    resultLimit100.pagination.limit,
    100,
  );
}
