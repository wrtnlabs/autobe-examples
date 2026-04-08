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
 * Test todo list pagination with member authentication.
 *
 * Validates the paginated todo list retrieval endpoint by authenticating a member and querying todos with pagination controls. Ensures that the response contains correct pagination metadata and todo summary structures.
 *
 * This test verifies the pagination system works correctly by testing various page sizes and validating the response structure including pagination metadata and todo summary fields.
 *
 * 1. Member authenticates via join endpoint.
 * 2. Query todo list with pagination parameters (page, limit).
 * 3. Validates pagination metadata (current, limit, records, pages).
 * 4. Validates pagination calculation correctness (pages = ceil(records / limit)).
 * 5. Validates todo summary structure and member reference through typia.assert.
 */
export async function test_api_todo_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(auth);
  // 2. Query todo list with pagination - Page 1, Limit 10
  const page1 = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(page1);
  // 3. Validate pagination metadata
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 10);
  TestValidator.predicate(
    "page 1 records non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages non-negative",
    page1.pagination.pages >= 0,
  );
  // 4. Validate pagination calculation: pages = ceil(records / limit)
  const expectedPages1 = Math.ceil(
    page1.pagination.records / page1.pagination.limit,
  );
  TestValidator.equals(
    "page 1 pages calculation",
    page1.pagination.pages,
    expectedPages1,
  );
  // 5. Validate todo summaries through typia.assert (type validation)
  for (const todo of page1.data) {
    typia.assert(todo);
  }
  // 6. Validate data length does not exceed limit
  TestValidator.predicate(
    "page 1 data length within limit",
    page1.data.length <= page1.pagination.limit,
  );
  // 7. Query todo list with pagination - Page 2, Limit 5
  const page2 = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(page2);
  // 8. Validate pagination metadata for page 2
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 5);
  TestValidator.predicate(
    "page 2 records non-negative",
    page2.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 2 pages non-negative",
    page2.pagination.pages >= 0,
  );
  // 9. Validate pagination calculation for page 2
  const expectedPages2 = Math.ceil(
    page2.pagination.records / page2.pagination.limit,
  );
  TestValidator.equals(
    "page 2 pages calculation",
    page2.pagination.pages,
    expectedPages2,
  );
  // 10. Validate data length does not exceed limit for page 2
  TestValidator.predicate(
    "page 2 data length within limit",
    page2.data.length <= page2.pagination.limit,
  );
  // 11. Validate total records consistency across pages
  TestValidator.equals(
    "records count consistent",
    page1.pagination.records,
    page2.pagination.records,
  );
}
