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
 * Test that viewing the trash list returns an empty result when no todos have been deleted.
 *
 * Validates the empty state handling of the trash endpoint by authenticating a new member and retrieving their trash list without any deleted todos. Ensures the endpoint returns proper pagination metadata with zero records and an empty data array.
 *
 * The test verifies:
 * 1. Successful authentication as a new member
 * 2. Empty trash list response with correct pagination structure
 * 3. Zero total records and zero total pages in pagination metadata
 * 4. Empty data array in the response
 * 5. Current page defaults to 1
 * 6. Limit reflects the requested page size
 *
 * 1. Create a new member account with random credentials.
 * 2. Call the trash list endpoint without creating any todos.
 * 3. Validate pagination metadata shows 0 records and 0 pages.
 * 4. Validate the data array is empty.
 * 5. Validate current page is 1 and limit is set correctly.
 */
export async function test_api_trash_list_empty_when_no_deleted_todos(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
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
  // 2. Call trash list endpoint without creating any todos
  const trashList = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trashList);
  // 3. Validate pagination metadata
  TestValidator.equals("total records is 0", trashList.pagination.records, 0);
  TestValidator.equals("total pages is 0", trashList.pagination.pages, 0);
  TestValidator.equals("current page is 1", trashList.pagination.current, 1);
  TestValidator.equals("limit matches request", trashList.pagination.limit, 10);
  // 4. Validate data array is empty
  TestValidator.equals("data array is empty", trashList.data.length, 0);
  TestValidator.equals("data array equals empty array", trashList.data, []);
}
