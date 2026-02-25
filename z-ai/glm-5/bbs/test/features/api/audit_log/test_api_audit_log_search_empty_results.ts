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
 * Test audit log search functionality with filters that return no matching results.
 *
 * This test validates that the audit log search endpoint properly handles
 * queries that return no matching records. It uses a highly unique search term
 * combined with action_type filter to ensure empty results, then verifies
 * the pagination structure is correctly formed with zero records.
 */
export async function test_api_audit_log_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a user via join
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Call audit-logs endpoint with search parameters that return no results
  const uniqueSearchTerm = `nonexistent_search_term_${RandomGenerator.alphaNumeric(16)}`;
  const requestBody = {
    search: uniqueSearchTerm,
    action_type: "BAN_USER",
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardAdminActionLog.IRequest;
  const response = await api.functional.discussionBoard.user.audit_logs.index(
    userConnection,
    { body: requestBody },
  );
  typia.assert(response);
  // 3. Validate empty results with proper pagination structure
  TestValidator.equals("data array is empty", response.data.length, 0);
  TestValidator.equals("records count is 0", response.pagination.records, 0);
  TestValidator.equals("pages count is 0", response.pagination.pages, 0);
  TestValidator.equals("limit is preserved", response.pagination.limit, 20);
  TestValidator.equals("current page is 1", response.pagination.current, 1);
}
