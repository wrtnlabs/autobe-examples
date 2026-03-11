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
 * Test the trash list endpoint when a member has no deleted todos (empty trash).
 *
 * This test validates the edge case where a member accesses their trash before
 * deleting any todos. The test:
 * 1. Registers and authenticates a new member
 * 2. Calls the trash list endpoint without creating or deleting any todos
 * 3. Validates that the response returns an empty data array
 * 4. Validates pagination metadata: records=0, pages=0, current=1
 */
export async function test_api_todo_trash_list_empty_trash(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  // 2. Call trash list endpoint with empty trash (no todos created or deleted)
  const trashList: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.trash.index(memberConnection, {
      body: {
        deleted: true,
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(trashList);
  // 3. Validate empty trash response
  TestValidator.equals("data array is empty", trashList.data.length, 0);
  TestValidator.equals("records count is 0", trashList.pagination.records, 0);
  TestValidator.equals("pages count is 0", trashList.pagination.pages, 0);
  TestValidator.equals("current page is 1", trashList.pagination.current, 1);
}
