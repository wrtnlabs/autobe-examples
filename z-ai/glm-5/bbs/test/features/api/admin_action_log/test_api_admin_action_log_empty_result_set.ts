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
 * Test the behavior when filtering administrative action logs returns an empty result set.
 * An administrator authenticates and requests logs with a date range or search term
 * that matches no records (e.g., a future date range or a non-existent search term).
 * The test validates that:
 * (1) the response returns a valid IPage structure without errors;
 * (2) the 'data' array is empty (length 0);
 * (3) pagination metadata shows current page (1), limit (default or specified),
 *     records count (0), and pages count (0);
 * (4) the API handles empty results gracefully without throwing exceptions.
 */
export async function test_api_admin_action_log_empty_result_set(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Query with a far future date range to ensure empty results
  // Using year 2100 date range - no logs should exist in this range
  const response =
    await api.functional.discussionBoard.user.adminActionLogs.index(
      userConnection,
      {
        body: {
          created_from: "2100-01-01T00:00:00Z",
          created_to: "2100-12-31T23:59:59Z",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAdminActionLog.IRequest,
      },
    );
  // 3. Validate response structure with typia.assert
  typia.assert(response);
  // 4. Validate empty result set
  TestValidator.equals("data array should be empty", response.data.length, 0);
  TestValidator.equals(
    "current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "records count should be 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals("pages count should be 0", response.pagination.pages, 0);
}
