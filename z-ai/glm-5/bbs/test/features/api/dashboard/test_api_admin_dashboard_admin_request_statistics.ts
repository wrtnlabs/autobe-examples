import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDashboardSummary";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_dashboard_admin_request_statistics(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator using the join utility
  await authorize_admin_join(adminConnection, {});
  // Retrieve dashboard statistics
  const dashboard: IDashboardSummary =
    await api.functional.discussionBoard.admin.dashboard.at(adminConnection);
  typia.assert(dashboard);
  // Validate admin request statistics
  // adminRequests_pending: counts requests with status='pending' and deleted_at IS NULL
  TestValidator.predicate(
    "adminRequests_pending is non-negative",
    dashboard.adminRequests_pending >= 0,
  );
  // adminRequests_approved: counts all historical approved requests regardless of deletion status
  TestValidator.predicate(
    "adminRequests_approved is non-negative",
    dashboard.adminRequests_approved >= 0,
  );
  // adminRequests_rejected: counts all historical rejected requests regardless of deletion status
  TestValidator.predicate(
    "adminRequests_rejected is non-negative",
    dashboard.adminRequests_rejected >= 0,
  );
}
