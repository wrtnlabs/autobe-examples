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
 * Test member todo list pagination with page size verification.
 *
 * Validates the paginated todo list endpoint with limited page sizes. Authenticates a member account, creates multiple todos for test data, then queries the todo list with specific pagination parameters. Verifies that page size limits are correctly enforced and pagination metadata accurately reflects the total record count and page calculations.
 *
 * 1. Member registers with email and password.
 * 2. Five todos are created for the authenticated member.
 * 3. Query with page=1 and limit=2 to retrieve the first page.
 * 4. Validate that exactly 2 items are returned in the data array.
 * 5. Verify pagination metadata shows correct current page, limit, total records, and calculated pages.
 * 6. Query with page=2 and limit=2 to retrieve the second page.
 * 7. Confirm the second page contains different todos from the first page.
 */
export async function test_api_member_todo_list_pagination_page_size(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create multiple todos for pagination test data
  const createdTodos = await ArrayUtil.asyncRepeat(5, async () =>
    generate_random_todo_app_member_todos_create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      },
    }),
  );
  // 3. Query with page=1, limit=2
  const page1 = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 2,
      },
    },
  );
  typia.assert(page1);
  // 4. Validate page 1 results
  TestValidator.equals("page 1 data has 2 items", page1.data.length, 2);
  TestValidator.equals("pagination current is 1", page1.pagination.current, 1);
  TestValidator.equals("pagination limit is 2", page1.pagination.limit, 2);
  TestValidator.equals("pagination records is 5", page1.pagination.records, 5);
  TestValidator.equals("pagination pages is 3", page1.pagination.pages, 3);
  // 5. Verify page=2 returns the next batch
  const page2 = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 2,
      },
    },
  );
  typia.assert(page2);
  // 6. Validate page 2 results
  TestValidator.equals("page 2 data has 2 items", page2.data.length, 2);
  TestValidator.equals("pagination current is 2", page2.pagination.current, 2);
  TestValidator.equals("pagination limit is 2", page2.pagination.limit, 2);
  TestValidator.equals("pagination records is 5", page2.pagination.records, 5);
  TestValidator.equals("pagination pages is 3", page2.pagination.pages, 3);
  // 7. Verify IDs are different between pages
  TestValidator.notEquals(
    "page 1 and page 2 have different first item IDs",
    page1.data[0].id,
    page2.data[0].id,
  );
}
