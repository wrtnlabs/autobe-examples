import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardErrorLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardErrorLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test error log temporal analysis capabilities for administrators.
 * This test validates that administrators can filter error logs by date ranges
 * to analyze error patterns over specific time periods.
 */
export async function test_api_error_logs_admin_temporal_analysis(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create a new connection for API calls (connection isolation pattern)
  const apiConnection: api.IConnection = { host: connection.host };
  apiConnection.headers = { ...adminConnection.headers };
  // Test 1: Filter with specific date range
  const startDate = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const endDate = new Date().toISOString(); // current time
  const resultWithDates =
    await api.functional.discussionBoard.admin.error_logs.index(apiConnection, {
      body: {
        start_date: startDate,
        end_date: endDate,
      } satisfies IDiscussionBoardErrorLog.IRequest,
    });
  typia.assert(resultWithDates);
  // Test 2: Filter with only start date (should include all errors from start_date onwards)
  const resultWithStartOnly =
    await api.functional.discussionBoard.admin.error_logs.index(apiConnection, {
      body: {
        start_date: startDate,
      } satisfies IDiscussionBoardErrorLog.IRequest,
    });
  typia.assert(resultWithStartOnly);
  // Test 3: Filter with only end date (should include all errors up to end_date)
  const resultWithEndOnly =
    await api.functional.discussionBoard.admin.error_logs.index(apiConnection, {
      body: {
        end_date: endDate,
      } satisfies IDiscussionBoardErrorLog.IRequest,
    });
  typia.assert(resultWithEndOnly);
  // Test 4: Empty date range (should return all errors)
  const resultEmptyDates =
    await api.functional.discussionBoard.admin.error_logs.index(apiConnection, {
      body: {} satisfies IDiscussionBoardErrorLog.IRequest,
    });
  typia.assert(resultEmptyDates);
}
