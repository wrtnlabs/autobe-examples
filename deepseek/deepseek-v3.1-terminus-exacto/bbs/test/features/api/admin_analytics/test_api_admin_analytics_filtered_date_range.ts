import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardArticleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleViewStat";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleViewStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that administrators can filter analytics data by specific date ranges to analyze patterns over time.
 * This scenario validates the ability to focus on particular time periods for trending analysis,
 * seasonal adjustments, or post-event evaluation.
 */
export async function test_api_admin_analytics_filtered_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authentication: Register as an administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Date Range Testing: Query analytics with specific date range filters
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  // Test 1: Full date range filter
  const analyticsFullRange =
    await api.functional.discussionBoard.admin.analytics.index(
      adminConnection,
      {
        body: {
          viewed_at_from: twoWeeksAgo.toISOString(),
          viewed_at_to: now.toISOString(),
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardArticleViewStat.IRequest,
      },
    );
  typia.assert(analyticsFullRange);
  // Test 2: Narrow date range filter
  const narrowStart = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
  const narrowEnd = new Date(now.getTime() - 1 * 60 * 60 * 1000); // 1 hour ago
  const analyticsNarrowRange =
    await api.functional.discussionBoard.admin.analytics.index(
      adminConnection,
      {
        body: {
          viewed_at_from: narrowStart.toISOString(),
          viewed_at_to: narrowEnd.toISOString(),
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardArticleViewStat.IRequest,
      },
    );
  typia.assert(analyticsNarrowRange);
  // Test 3: Start-only filtering
  const analyticsStartOnly =
    await api.functional.discussionBoard.admin.analytics.index(
      adminConnection,
      {
        body: {
          viewed_at_from: oneWeekAgo.toISOString(),
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardArticleViewStat.IRequest,
      },
    );
  typia.assert(analyticsStartOnly);
  // Test 4: End-only filtering
  const analyticsEndOnly =
    await api.functional.discussionBoard.admin.analytics.index(
      adminConnection,
      {
        body: {
          viewed_at_to: now.toISOString(),
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardArticleViewStat.IRequest,
      },
    );
  typia.assert(analyticsEndOnly);
  // 3. Viewer Type Analysis: Test filtering by viewer_type
  const viewerTypes = ["member", "admin", "super_admin", "guest"] as const;
  for (const viewerType of viewerTypes) {
    const analyticsByViewerType =
      await api.functional.discussionBoard.admin.analytics.index(
        adminConnection,
        {
          body: {
            viewed_at_from: oneWeekAgo.toISOString(),
            viewed_at_to: now.toISOString(),
            viewer_type: viewerType,
            limit: 10,
            page: 1,
          } satisfies IDiscussionBoardArticleViewStat.IRequest,
        },
      );
    typia.assert(analyticsByViewerType);
  }
  // 4. Cross-Filter Validation: Combine multiple filters
  const analyticsCrossFilter =
    await api.functional.discussionBoard.admin.analytics.index(
      adminConnection,
      {
        body: {
          viewed_at_from: oneWeekAgo.toISOString(),
          viewed_at_to: now.toISOString(),
          viewer_type: "member",
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardArticleViewStat.IRequest,
      },
    );
  typia.assert(analyticsCrossFilter);
  // Validate pagination metadata using TestValidator for business logic
  TestValidator.predicate(
    "pagination should have valid current page",
    analyticsCrossFilter.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid limit",
    analyticsCrossFilter.pagination.limit >= 1 &&
      analyticsCrossFilter.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination should have valid records count",
    analyticsCrossFilter.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid pages count",
    analyticsCrossFilter.pagination.pages >= 0,
  );
  // Test business logic: Different filter combinations should return different results
  TestValidator.notEquals(
    "full range and narrow range should return different results",
    analyticsFullRange.data.length,
    analyticsNarrowRange.data.length,
  );
  TestValidator.notEquals(
    "start-only and end-only filtering should return different results",
    analyticsStartOnly.data.length,
    analyticsEndOnly.data.length,
  );
}
