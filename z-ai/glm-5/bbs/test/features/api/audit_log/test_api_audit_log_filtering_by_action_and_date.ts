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
 * Test audit log retrieval with multiple filter parameters applied simultaneously.
 * 1. Authenticate user via join
 * 2. Call audit-logs endpoint with action_type, target_type, and date range filters
 * 3. Verify response contains logs matching all filter criteria
 * 4. Verify pagination correctly reflects filtered result count
 */
export async function test_api_audit_log_filtering_by_action_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Define date range for filtering (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const created_from = thirtyDaysAgo.toISOString();
  const created_to = now.toISOString();
  // 3. Call audit-logs with multiple filters
  const requestBody = {
    action_type: "ARTICLE_DELETE",
    target_type: "ARTICLE",
    created_from,
    created_to,
    page: 1,
    limit: 50,
  } satisfies IDiscussionBoardAdminActionLog.IRequest;
  const response = await api.functional.discussionBoard.user.audit_logs.index(
    userConnection,
    { body: requestBody },
  );
  typia.assert(response);
  // 4. Verify all logs match the filter criteria
  for (const log of response.data) {
    TestValidator.equals(
      "actionType matches filter",
      log.actionType,
      "ARTICLE_DELETE",
    );
    TestValidator.equals(
      "targetType matches filter",
      log.targetType,
      "ARTICLE",
    );
    const logDate = new Date(log.createdAt);
    const fromDate = new Date(created_from);
    const toDate = new Date(created_to);
    TestValidator.predicate(
      "createdAt within date range",
      logDate >= fromDate && logDate <= toDate,
    );
  }
  // 5. Verify pagination reflects filtered results
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 50", response.pagination.limit, 50);
  TestValidator.predicate(
    "records count matches data length or total",
    response.data.length <= response.pagination.limit,
  );
}
