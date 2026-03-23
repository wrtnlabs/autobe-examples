import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that viewing trash returns an empty list when no todos have been deleted.
 *
 * This test validates the empty state handling of the trash endpoint by:
 * 1. Registering a new member user with no existing todos
 * 2. Accessing the trash endpoint
 * 3. Verifying the response contains an empty data array
 * 4. Confirming pagination metadata shows 0 total records
 */
export async function test_api_trash_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: undefined,
  });
  // 2. Access trash endpoint with empty request (no filters)
  const trashResponse = await api.functional.multiUserTodo.member.trash.index(
    memberConnection,
    {
      body: {} satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  // 3. Validate response type
  typia.assert(trashResponse);
  // 4. Verify empty state conditions
  TestValidator.equals(
    "trash data array is empty",
    trashResponse.data.length,
    0,
  );
  TestValidator.equals(
    "total records is 0",
    trashResponse.pagination.records,
    0,
  );
  TestValidator.predicate(
    "current page is at least 1",
    trashResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is positive",
    trashResponse.pagination.limit > 0,
  );
  TestValidator.equals(
    "total pages is 0 for empty trash",
    trashResponse.pagination.pages,
    0,
  );
}
