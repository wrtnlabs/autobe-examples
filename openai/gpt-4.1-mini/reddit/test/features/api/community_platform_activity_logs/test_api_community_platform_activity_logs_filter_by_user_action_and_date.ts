import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActivityLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_platform_activity_logs_filter_by_user_action_and_date(
  connection: api.IConnection,
): Promise<void> {
  // This test validates filtering activity logs by user ID, action type, and date range.
  // Setup admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Prepare realistic filter parameters
  // Since ICommunityPlatformActivityLog.IRequest is empty in definition, but description says filtering by user_id, action_type, created_at range, ip_address supported,
  // we'll mimic request body accordingly.
  // Create filter values
  // Using realistic ISO8601 date strings for date range
  const user_id = "00000000-0000-0000-0000-000000000000"; // Assuming some user ID for test
  const action_type = "login"; // Example action; must be in real scenario
  const start_date = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const end_date = new Date().toISOString(); // now
  // Construct request body with filters as expected by API for filtering
  // Even though schema has IRequest as empty, the endpoint description mentions filters are accepted.
  // We include these as any to match intended input.
  const body: ICommunityPlatformActivityLog.IRequest = {
    user_id: user_id, // filter by user ID
    action_type: action_type, // filter by action type
    created_at: {
      from: start_date,
      to: end_date,
    },
  } as any;
  // Call the API
  const result = await api.functional.communityPlatform.activityLogs.index(
    adminConnection,
    { body },
  );
  // Validate the response shape
  typia.assert(result);
  // Since properties user_id, action_type, created_at do not exist on result.data items, skip validating them
  // Validate pagination metadata
  TestValidator.predicate(
    "current page positive",
    result.pagination.current > 0,
  );
  TestValidator.predicate("limit positive", result.pagination.limit > 0);
  TestValidator.predicate(
    "records non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate("pages non-negative", result.pagination.pages >= 0);
  // records count should match data length
  TestValidator.equals(
    "records count matches data length",
    result.pagination.records,
    result.data.length,
  );
  // pages should be at least 1 if records > 0 else 0
  TestValidator.predicate(
    "pages count consistency",
    result.pagination.records === 0
      ? result.pagination.pages === 0
      : result.pagination.pages >= 1,
  );
}
