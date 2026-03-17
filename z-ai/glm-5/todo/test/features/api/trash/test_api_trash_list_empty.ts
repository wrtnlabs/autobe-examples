import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPrivateTodoAppTodo";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import type { IPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_trash_list_empty(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test viewing the trash list when no todos have been deleted.
   *
   * Pre-conditions:
   * 1. Member is authenticated
   * 2. Member has no deleted todos (empty trash)
   * 3. Member may have active todos but none in trash
   *
   * Test steps:
   * 1. Authenticate as a new member
   * 2. Call PATCH /privateTodoApp/member/trash with default parameters
   * 3. Verify response returns an empty data array
   * 4. Verify pagination metadata shows zero records
   *
   * Validation points:
   * - Response status 200
   * - Pagination object shows current=1, records=0, pages=0
   * - Data array is empty []
   * - No errors returned for empty trash scenario
   * - API handles empty result gracefully
   */
  // 1. Create member-specific connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: {} });
  // 2. Call trash endpoint with default parameters
  const trashList = await api.functional.privateTodoApp.member.trash.index(
    memberConnection,
    {
      body: {} satisfies IPrivateTodoAppTodo.IRequest,
    },
  );
  typia.assert(trashList);
  // 3. Validate pagination metadata shows zero records
  TestValidator.equals("current page", trashList.pagination.current, 1);
  TestValidator.equals("total records", trashList.pagination.records, 0);
  TestValidator.equals("total pages", trashList.pagination.pages, 0);
  // 4. Validate empty data array
  TestValidator.equals("empty data array", trashList.data.length, 0);
}
