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
 * Test viewing trash list when no todos have been deleted.
 *
 * This test verifies that:
 * 1. A new member with no deleted todos gets an empty trash list
 * 2. Pagination metadata is correct for empty results
 * 3. The API call succeeds without error
 */
export async function test_api_trash_list_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account (fresh account with no deleted todos)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Request trash list (should be empty for new member)
  const response = await api.functional.todoApp.member.trash.index(
    memberConnection,
    {
      body: {
        deleted: "trashed",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate empty trash list
  TestValidator.equals("trash data should be empty", response.data.length, 0);
  TestValidator.equals(
    "total records should be 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals("total pages should be 0", response.pagination.pages, 0);
  TestValidator.equals(
    "current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 10", response.pagination.limit, 10);
}
