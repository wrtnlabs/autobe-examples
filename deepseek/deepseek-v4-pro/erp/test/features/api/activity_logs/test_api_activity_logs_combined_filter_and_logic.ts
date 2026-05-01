import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test activity log combined filter semantics and individual filter validation.
 *
 * Validates that activity log filtering with multiple criteria operates with AND semantics — all filter conditions must be satisfied conjunctively. Also verifies each individual filter type works correctly in isolation and that non-matching combinations correctly return empty result sets.
 *
 * 1. Authenticate a member and fetch all activity logs as baseline.
 * 2. Apply combined filter (action_type + user_id + date range) verifying all entries satisfy every condition.
 * 3. Test each filter in isolation: action_type, user_id, date range.
 * 4. Verify non-matching combination returns empty page with zero total count.
 * 5. Validate pagination metadata correctness for all filter combinations.
 */
export async function test_api_activity_logs_combined_filter_and_logic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member via utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Fetch all activity logs without filters to establish baseline
  const allLogs = await api.functional.erpHrm.member.activity_logs.index(
    memberConnection,
    { body: {} satisfies IErpHrmActivityLog.IRequest },
  );
  typia.assert(allLogs);
  if (allLogs.data.length === 0) {
    return;
  }
  // 3. Extract filter candidates from existing log data
  const sampleLog = allLogs.data[0];
  const filterActionType = sampleLog.action_type;
  const filterUserId = sampleLog.user.id;
  const allTimestamps = allLogs.data.map((log) =>
    new Date(log.created_at).getTime(),
  );
  const dateFrom = new Date(Math.min(...allTimestamps)).toISOString();
  const dateTo = new Date(Math.max(...allTimestamps)).toISOString();
  // 4. Combined filter (all three): verify AND semantics conjunctively
  const combinedResult = await api.functional.erpHrm.member.activity_logs.index(
    memberConnection,
    {
      body: {
        action_type: filterActionType,
        user_id: filterUserId,
        date_from: dateFrom,
        date_to: dateTo,
      } satisfies IErpHrmActivityLog.IRequest,
    },
  );
  typia.assert(combinedResult);
  TestValidator.predicate(
    "combined filter returns at least one entry",
    combinedResult.data.length > 0,
  );
  for (const entry of combinedResult.data) {
    TestValidator.equals(
      "combined filter: action_type matches",
      entry.action_type,
      filterActionType,
    );
    TestValidator.equals(
      "combined filter: user.id matches",
      entry.user.id,
      filterUserId,
    );
    const entryTime = new Date(entry.created_at).getTime();
    TestValidator.predicate(
      "combined filter: created_at >= date_from",
      entryTime >= new Date(dateFrom).getTime(),
    );
    TestValidator.predicate(
      "combined filter: created_at <= date_to",
      entryTime <= new Date(dateTo).getTime(),
    );
  }
  // 5. Action type only filter
  const actionTypeResult =
    await api.functional.erpHrm.member.activity_logs.index(memberConnection, {
      body: {
        action_type: filterActionType,
      } satisfies IErpHrmActivityLog.IRequest,
    });
  typia.assert(actionTypeResult);
  for (const entry of actionTypeResult.data) {
    TestValidator.equals(
      "action_type only: type matches",
      entry.action_type,
      filterActionType,
    );
  }
  // 6. User ID only filter
  const userIdResult = await api.functional.erpHrm.member.activity_logs.index(
    memberConnection,
    {
      body: {
        user_id: filterUserId,
      } satisfies IErpHrmActivityLog.IRequest,
    },
  );
  typia.assert(userIdResult);
  for (const entry of userIdResult.data) {
    TestValidator.equals(
      "user_id only: user matches",
      entry.user.id,
      filterUserId,
    );
  }
  // 7. Date range only filter
  const dateRangeResult =
    await api.functional.erpHrm.member.activity_logs.index(memberConnection, {
      body: {
        date_from: dateFrom,
        date_to: dateTo,
      } satisfies IErpHrmActivityLog.IRequest,
    });
  typia.assert(dateRangeResult);
  for (const entry of dateRangeResult.data) {
    const entryTime = new Date(entry.created_at).getTime();
    TestValidator.predicate(
      "date range only: created_at >= date_from",
      entryTime >= new Date(dateFrom).getTime(),
    );
    TestValidator.predicate(
      "date range only: created_at <= date_to",
      entryTime <= new Date(dateTo).getTime(),
    );
  }
  // 8. Non-matching combination: valid action_type + never-matching user_id = AND semantics
  const nonMatchingResult =
    await api.functional.erpHrm.member.activity_logs.index(memberConnection, {
      body: {
        action_type: filterActionType,
        user_id: "00000000-0000-0000-0000-000000000000",
        date_from: dateFrom,
        date_to: dateTo,
      } satisfies IErpHrmActivityLog.IRequest,
    });
  typia.assert(nonMatchingResult);
  TestValidator.equals(
    "non-matching combination: empty data array",
    nonMatchingResult.data.length,
    0,
  );
  TestValidator.equals(
    "non-matching combination: zero total records",
    nonMatchingResult.pagination.records,
    0,
  );
  // 9. Pagination metadata verification for all filter combinations
  TestValidator.equals(
    "combined pagination: current page is 1",
    combinedResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "combined pagination: limit is positive",
    combinedResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "combined pagination: records count matches filtered subset",
    combinedResult.pagination.records >= combinedResult.data.length,
  );
  TestValidator.predicate(
    "combined pagination: pages computed correctly",
    combinedResult.pagination.pages >= 1,
  );
  TestValidator.equals(
    "non-matching pagination: current still 1 even when empty",
    nonMatchingResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "non-matching pagination: zero pages for empty result",
    nonMatchingResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "non-matching pagination: zero records",
    nonMatchingResult.pagination.records,
    0,
  );
}
