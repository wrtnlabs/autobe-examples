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

/**
 * Test the scenario where a member views their trash when it contains no soft-deleted todos.
 * This validates the empty state handling and proper pagination response when no trash entries exist.
 *
 * Steps:
 * 1. Create a fresh member user with no existing todos
 * 2. Call the trash entries endpoint with default pagination
 * 3. Validate empty response with correct pagination metadata
 */
export async function test_api_trash_view_empty_trash(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a fresh member connection with no existing todos
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // 2. Call trash entries with explicit default pagination (page: 1)
  const response =
    await api.functional.multiUserTodo.member.todos.trash_entries.index(
      memberConnection,
      {
        body: {
          page: 1,
        } satisfies IMultiUserTodoTodoTrashEntry.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate empty data array
  TestValidator.equals("data array empty", response.data, []);
  // 4. Validate pagination metadata for empty result
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.predicate("limit positive", response.pagination.limit > 0);
  TestValidator.predicate(
    "limit within valid range",
    response.pagination.limit >= 1 && response.pagination.limit <= 100,
  );
  TestValidator.equals("zero records", response.pagination.records, 0);
  TestValidator.equals("zero pages", response.pagination.pages, 0);
}
