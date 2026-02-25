import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminActionLog";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminActionLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test the basic functionality of retrieving administrative action logs
 * with default pagination parameters. An administrator authenticates via
 * join and then requests the action log list without any filters. The test
 * validates that: (1) the response returns a valid paginated structure with
 * 'pagination' containing current page (1), limit (default 20), total records
 * count, and total pages count; (2) the 'data' array contains admin action
 * log summary objects each with id (UUID), actionType, targetType, targetTitle,
 * administrator object (id, displayName, email), originalAuthor (nullable),
 * reason (nullable), and createdAt timestamp; (3) results are sorted by
 * createdAt in descending order (newest first); (4) the administrator's
 * profile information is correctly included in each log entry.
 */
export async function test_api_admin_action_log_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication via join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_user_join(adminConnection, {});
  typia.assert(admin);
  // 2. Request action log list with default pagination (no filters)
  const result =
    await api.functional.discussionBoard.user.adminActionLogs.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardAdminActionLog.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate pagination structure - defaults to page 1, limit 20
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.equals("limit is default 20", result.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    result.pagination.pages >= 0,
  );
  // 4. Validate results are sorted by createdAt in descending order (newest first)
  for (let i = 1; i < result.data.length; i++) {
    const prevDate = new Date(result.data[i - 1].createdAt);
    const currDate = new Date(result.data[i].createdAt);
    TestValidator.predicate(
      "results sorted by createdAt descending",
      prevDate >= currDate,
    );
  }
  // 5. Validate pagination consistency
  if (result.pagination.records > 0) {
    const expectedPages = Math.ceil(
      result.pagination.records / result.pagination.limit,
    );
    TestValidator.equals(
      "pages count matches records and limit",
      result.pagination.pages,
      expectedPages,
    );
  }
}
