import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleViewStatEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleViewStatEvent";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardArticleViewStatEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleViewStatEvent";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test date-based filtering scenarios for article view analytics.
 * Authenticate as superAdmin, then test analytics filtering with specific date
 * ranges to ensure temporal filtering works correctly. Verify that start_date and
 * end_date parameters properly constrain results to specified timeframe. Test
 * edge cases including overlapping date ranges, single-day filtering, and empty
 * date ranges. Validate that last_viewed_at timestamps fall within specified
 * range and that analytics accurately reflects view patterns across different
 * time periods.
 */
export async function test_api_analytics_article_views_superadmin_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create superAdmin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      href: "https://discussion-board.test/admin/analytics",
      referrer: "https://discussion-board.test",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Recent articles within last 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const recentAnalytics =
    await api.functional.discussionBoard.superAdmin.analytics.article_views.index(
      superAdminConnection,
      {
        body: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleViewStatEvent.IRequest,
      },
    );
  typia.assert(recentAnalytics);
  // Validate all articles have timestamps within date range
  for (const stat of recentAnalytics.data) {
    TestValidator.predicate(
      `stat ${stat.id} should have last_viewed_at within range or null`,
      stat.last_viewed_at === null ||
        (new Date(stat.last_viewed_at) >= startDate &&
          new Date(stat.last_viewed_at) <= endDate),
    );
  }
  // Test 2: Single-day filtering
  const singleDay = new Date();
  singleDay.setHours(0, 0, 0, 0);
  const singleDayAnalytics =
    await api.functional.discussionBoard.superAdmin.analytics.article_views.index(
      superAdminConnection,
      {
        body: {
          start_date: singleDay.toISOString(),
          end_date: new Date(
            singleDay.getTime() + 24 * 60 * 60 * 1000,
          ).toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleViewStatEvent.IRequest,
      },
    );
  typia.assert(singleDayAnalytics);
  // Test 3: Overlapping date ranges
  const overlappingStart = new Date();
  overlappingStart.setDate(overlappingStart.getDate() - 15);
  const overlappingEnd = new Date();
  overlappingEnd.setDate(overlappingEnd.getDate() + 15);
  const overlappingAnalytics =
    await api.functional.discussionBoard.superAdmin.analytics.article_views.index(
      superAdminConnection,
      {
        body: {
          start_date: overlappingStart.toISOString(),
          end_date: overlappingEnd.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleViewStatEvent.IRequest,
      },
    );
  typia.assert(overlappingAnalytics);
  // Test 4: Future date range (likely empty)
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 1);
  const futureAnalytics =
    await api.functional.discussionBoard.superAdmin.analytics.article_views.index(
      superAdminConnection,
      {
        body: {
          start_date: futureDate.toISOString(),
          end_date: new Date(
            futureDate.getTime() + 24 * 60 * 60 * 1000,
          ).toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleViewStatEvent.IRequest,
      },
    );
  typia.assert(futureAnalytics);
  // Test 5: User type filtering
  const userTypeAnalytics =
    await api.functional.discussionBoard.superAdmin.analytics.article_views.index(
      superAdminConnection,
      {
        body: {
          user_type: "user" as const,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleViewStatEvent.IRequest,
      },
    );
  typia.assert(userTypeAnalytics);
  // Test 6: No date filters (get all data)
  const allAnalytics =
    await api.functional.discussionBoard.superAdmin.analytics.article_views.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardArticleViewStatEvent.IRequest,
      },
    );
  typia.assert(allAnalytics);
  // Validate analytics data structure for all tests
  const allResults = [
    recentAnalytics,
    singleDayAnalytics,
    overlappingAnalytics,
    futureAnalytics,
    userTypeAnalytics,
    allAnalytics,
  ];
  for (const analytics of allResults) {
    // Access pagination through the correct nested structure
    const actualPagination =
      analytics.pagination?.pagination?.pagination?.pagination;
    if (actualPagination) {
      TestValidator.predicate(
        "pagination should have valid metadata",
        (actualPagination.current ?? 0) >= 0 &&
          (actualPagination.limit ?? 0) > 0 &&
          (actualPagination.records ?? 0) >= 0 &&
          (actualPagination.pages ?? 0) >= 0,
      );
    }
    for (const stat of analytics.data) {
      TestValidator.predicate(
        `stat ${stat.id} should have positive total_view_count`,
        stat.total_view_count >= 0,
      );
      TestValidator.predicate(
        `stat ${stat.id} should have unique_viewer_count <= total_view_count`,
        stat.unique_viewer_count <= stat.total_view_count,
      );
      TestValidator.predicate(
        `stat ${stat.id} should have valid article summary`,
        stat.article !== null && stat.article.id !== "",
      );
    }
  }
}
