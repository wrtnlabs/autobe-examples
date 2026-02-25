import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminHierarchyAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminHierarchyAction";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminHierarchyAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminHierarchyAction";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test pagination of administrator hierarchy action records.
 *
 * 1. Create and authenticate a user to access the audit trail endpoint
 * 2. Query the admin hierarchy actions endpoint with pagination parameters (page=1, limit=10)
 * 3. Verify the response contains valid pagination structure (current page, limit, total records, total pages)
 * 4. Confirm data length respects the pagination limit
 */
export async function test_api_admin_hierarchy_actions_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Query admin hierarchy actions with pagination
  const result =
    await api.functional.discussionBoard.user.adminHierarchyActions.index(
      userConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminHierarchyAction.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate pagination structure
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.equals("limit is 10", result.pagination.limit, 10);
  TestValidator.predicate(
    "records count is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    result.pagination.pages >= 0,
  );
  // 4. Validate data array length does not exceed limit
  TestValidator.predicate(
    "data length does not exceed limit",
    result.data.length <= 10,
  );
}
