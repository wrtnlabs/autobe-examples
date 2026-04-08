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
 * Test the edge case where a member has no deleted todos in trash.
 *
 * Validates that the trash listing endpoint handles empty trash gracefully by returning proper pagination metadata and an empty data array. This ensures UI components can correctly render empty states without errors.
 *
 * 1. Authenticate a new member account without creating any todos.
 * 2. Call the trash listing endpoint to retrieve deleted todos.
 * 3. Verify the response contains an empty data array.
 * 4. Verify pagination metadata shows records=0 and pages=0.
 * 5. Verify the current page defaults to 1.
 * 6. Validate the complete response structure is correct.
 */
export async function test_api_trash_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member without creating any todos
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Call trash listing endpoint with default pagination
  const trash = await api.functional.todoApp.member.trash.index(
    memberConnection,
    {
      body: {} satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trash);
  // 3. Verify data array is empty
  TestValidator.equals("empty data array", trash.data.length, 0);
  // 4. Verify pagination metadata
  TestValidator.equals("records is 0", trash.pagination.records, 0);
  TestValidator.equals("pages is 0", trash.pagination.pages, 0);
  TestValidator.equals("current page is 1", trash.pagination.current, 1);
  TestValidator.predicate("limit is positive", trash.pagination.limit > 0);
}
