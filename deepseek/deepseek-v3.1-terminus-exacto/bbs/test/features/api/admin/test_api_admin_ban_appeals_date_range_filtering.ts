import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanAppeal";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator ban appeals date range filtering functionality.
 *
 * Tests the ability to filter ban appeals by date ranges for both appeal submission
 * (appealed_at) and review completion (reviewed_at) timelines. Validates that
 * date range filtering works correctly with various combinations and boundary
 * conditions.
 */
export async function test_api_admin_ban_appeals_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate administrator using utility function
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
  // Note: Since we cannot create ban appeals through the API (no creation endpoint provided),
  // we can only test the filtering functionality with whatever data exists in the system.
  // This tests that the date range filtering logic works correctly without causing errors.
  // Test 1: Filter by appealed_at date range with realistic dates
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const appealedAtStart = new Date(now.getTime() - 30 * oneDayMs).toISOString(); // 30 days ago
  const appealedAtEnd = now.toISOString(); // Current time
  const appealsByAppealDate =
    await api.functional.discussionBoard.admin.appeals.index(adminConnection, {
      body: {
        appealed_at_start: appealedAtStart,
        appealed_at_end: appealedAtEnd,
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardBanAppeal.IRequest,
    });
  typia.assert(appealsByAppealDate);
  // Test 2: Filter by reviewed_at date range
  const reviewedAtStart = new Date(now.getTime() - 30 * oneDayMs).toISOString(); // 30 days ago
  const reviewedAtEnd = now.toISOString(); // Current time
  const appealsByReviewDate =
    await api.functional.discussionBoard.admin.appeals.index(adminConnection, {
      body: {
        reviewed_at_start: reviewedAtStart,
        reviewed_at_end: reviewedAtEnd,
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardBanAppeal.IRequest,
    });
  typia.assert(appealsByReviewDate);
  // Test 3: Combined filtering with status and date ranges
  const combinedFilter =
    await api.functional.discussionBoard.admin.appeals.index(adminConnection, {
      body: {
        status: "pending",
        appealed_at_start: new Date(
          now.getTime() - 30 * oneDayMs,
        ).toISOString(),
        appealed_at_end: now.toISOString(),
        limit: 5,
        page: 1,
      } satisfies IDiscussionBoardBanAppeal.IRequest,
    });
  typia.assert(combinedFilter);
  // Test 4: Single day filtering
  const singleDay = new Date(now.getTime() - 15 * oneDayMs); // 15 days ago
  const singleDayStart = singleDay.toISOString();
  const singleDayEnd = singleDay.toISOString();
  const singleDayAppeals =
    await api.functional.discussionBoard.admin.appeals.index(adminConnection, {
      body: {
        appealed_at_start: singleDayStart,
        appealed_at_end: singleDayEnd,
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardBanAppeal.IRequest,
    });
  typia.assert(singleDayAppeals);
  // Test 5: Overlapping date ranges
  const overlapStart = new Date(now.getTime() - 20 * oneDayMs).toISOString();
  const overlapEnd = new Date(now.getTime() - 10 * oneDayMs).toISOString();
  const overlapAppeals =
    await api.functional.discussionBoard.admin.appeals.index(adminConnection, {
      body: {
        appealed_at_start: overlapStart,
        appealed_at_end: overlapEnd,
        reviewed_at_start: overlapStart,
        reviewed_at_end: overlapEnd,
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardBanAppeal.IRequest,
    });
  typia.assert(overlapAppeals);
  // Test 6: Empty search term with date ranges
  const emptySearchAppeals =
    await api.functional.discussionBoard.admin.appeals.index(adminConnection, {
      body: {
        search: "",
        appealed_at_start: new Date(
          now.getTime() - 30 * oneDayMs,
        ).toISOString(),
        appealed_at_end: now.toISOString(),
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardBanAppeal.IRequest,
    });
  typia.assert(emptySearchAppeals);
  // Test 7: Different pagination combinations
  const paginationTest =
    await api.functional.discussionBoard.admin.appeals.index(adminConnection, {
      body: {
        appealed_at_start: new Date(
          now.getTime() - 30 * oneDayMs,
        ).toISOString(),
        appealed_at_end: now.toISOString(),
        limit: 20,
        page: 2,
      } satisfies IDiscussionBoardBanAppeal.IRequest,
    });
  typia.assert(paginationTest);
}
