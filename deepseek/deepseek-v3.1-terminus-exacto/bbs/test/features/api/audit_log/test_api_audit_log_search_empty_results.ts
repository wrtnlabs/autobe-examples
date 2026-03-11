import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_audit_log_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Generate highly specific filter criteria unlikely to match any existing audit logs
  const searchCriteria: IDiscussionBoardAuditLog.IRequest = {
    actorType: "system", // Use 'system' actor type which may not have records
    actionType: "non_existent_action_type", // Use non-existent action type
    targetType: "non_existent_target_type", // Use non-existent target type
    startDate: new Date(Date.now() + 86400000).toISOString(), // Future date (tomorrow)
    endDate: new Date(Date.now() + 172800000).toISOString(), // Future date (day after tomorrow)
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardAuditLog.IRequest;
  // Perform audit log search with specific filters
  const response = await api.functional.discussionBoard.admin.audit_logs.index(
    adminConnection,
    {
      body: searchCriteria,
    },
  );
  typia.assert(response);
  // Validate empty result set
  TestValidator.equals(
    "data array should be empty",
    response.data,
    [] satisfies IDiscussionBoardAuditLog.ISummary[],
  );
  // Validate pagination metadata for empty result set
  TestValidator.equals(
    "current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 10", response.pagination.limit, 10);
  TestValidator.equals(
    "total records should be 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals("total pages should be 0", response.pagination.pages, 0);
}
