import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBanHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanHistory";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBanHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test date range filtering for ban history records to support compliance audits
 * and historical analysis.
 *
 * This test verifies:
 * 1. Date range filtering works correctly with from/to parameters
 * 2. Records returned are within the specified date range (inclusive)
 * 3. Edge case: single day query (from equals to)
 * 4. Date range filter works in conjunction with action_type filter
 * 5. Results maintain descending sort order by created_at
 */
export async function test_api_ban_history_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Authenticate as a user
  const authorized = await authorize_user_join(userConnection, {});
  typia.assert(authorized);
  const userId = authorized.id;
  // Define date ranges for testing
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  // Test 1: Wide date range spanning multiple months
  const wideRangeResult =
    await api.functional.discussionBoard.user.users.ban_histories.index(
      userConnection,
      {
        userId,
        body: {
          created_at: {
            from: twoMonthsAgo.toISOString(),
            to: now.toISOString(),
          },
        },
      },
    );
  typia.assert(wideRangeResult);
  // Verify all records are within the wide date range
  for (const record of wideRangeResult.data) {
    const recordDate = new Date(record.createdAt);
    TestValidator.predicate(
      "record within wide date range",
      recordDate >= twoMonthsAgo && recordDate <= now,
    );
  }
  // Test 2: Narrow date range (one week)
  const narrowRangeResult =
    await api.functional.discussionBoard.user.users.ban_histories.index(
      userConnection,
      {
        userId,
        body: {
          created_at: {
            from: oneWeekAgo.toISOString(),
            to: now.toISOString(),
          },
        },
      },
    );
  typia.assert(narrowRangeResult);
  // Verify all records are within the narrow date range
  for (const record of narrowRangeResult.data) {
    const recordDate = new Date(record.createdAt);
    TestValidator.predicate(
      "record within narrow date range",
      recordDate >= oneWeekAgo && recordDate <= now,
    );
  }
  // Test 3: Single day query (from equals to) - edge case
  const singleDayResult =
    await api.functional.discussionBoard.user.users.ban_histories.index(
      userConnection,
      {
        userId,
        body: {
          created_at: {
            from: oneWeekAgo.toISOString(),
            to: oneWeekAgo.toISOString(),
          },
        },
      },
    );
  typia.assert(singleDayResult);
  // For single day query, verify records are within the exact timestamp or same day
  for (const record of singleDayResult.data) {
    const recordDate = new Date(record.createdAt);
    const queryDate = new Date(oneWeekAgo);
    TestValidator.predicate(
      "record on single day query",
      recordDate.toDateString() === queryDate.toDateString(),
    );
  }
  // Test 4: Date range filter combined with action_type filter
  const combinedFilterResult =
    await api.functional.discussionBoard.user.users.ban_histories.index(
      userConnection,
      {
        userId,
        body: {
          action_type: "BAN",
          created_at: {
            from: oneMonthAgo.toISOString(),
            to: now.toISOString(),
          },
        },
      },
    );
  typia.assert(combinedFilterResult);
  // Verify all records match both filters
  for (const record of combinedFilterResult.data) {
    const recordDate = new Date(record.createdAt);
    TestValidator.predicate(
      "record within date range with action_type filter",
      recordDate >= oneMonthAgo && recordDate <= now,
    );
    TestValidator.equals("action_type matches", record.actionType, "BAN");
  }
  // Test 5: Verify descending sort order by created_at
  for (let i = 0; i < wideRangeResult.data.length - 1; i++) {
    const current = new Date(wideRangeResult.data[i].createdAt);
    const next = new Date(wideRangeResult.data[i + 1].createdAt);
    TestValidator.predicate(
      "descending sort order by created_at",
      current >= next,
    );
  }
}
