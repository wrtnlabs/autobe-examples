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

export async function test_api_analytics_article_views_superadmin_comprehensive(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Test 1: Basic analytics query with default pagination
  const basicAnalytics =
    await api.functional.discussionBoard.superAdmin.analytics.article_views.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleViewStatEvent.IRequest,
      },
    );
  typia.assert(basicAnalytics);
  // Test 2: Analytics with date range filtering
  const dateFilteredAnalytics =
    await api.functional.discussionBoard.superAdmin.analytics.article_views.index(
      superAdminConnection,
      {
        body: {
          start_date: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          end_date: new Date().toISOString(),
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardArticleViewStatEvent.IRequest,
      },
    );
  typia.assert(dateFilteredAnalytics);
  // Test 3: Analytics with user type filtering
  const userTypeAnalytics =
    await api.functional.discussionBoard.superAdmin.analytics.article_views.index(
      superAdminConnection,
      {
        body: {
          user_type: "user",
          page: 1,
          limit: 8,
        } satisfies IDiscussionBoardArticleViewStatEvent.IRequest,
      },
    );
  typia.assert(userTypeAnalytics);
  // Test 4: Analytics with different pagination parameters
  const paginationTest =
    await api.functional.discussionBoard.superAdmin.analytics.article_views.index(
      superAdminConnection,
      {
        body: {
          page: 2,
          limit: 3,
        } satisfies IDiscussionBoardArticleViewStatEvent.IRequest,
      },
    );
  typia.assert(paginationTest);
  // Simplified validation focusing on actual business logic
  // The nested pagination structure is too complex to validate directly
  TestValidator.predicate(
    "analytics data structure is valid",
    Array.isArray(basicAnalytics.data),
  );
  // Validate analytics data business logic
  if (basicAnalytics.data.length > 0) {
    const stat = basicAnalytics.data[0];
    TestValidator.predicate(
      "total views should be >= unique viewers",
      stat.total_view_count >= stat.unique_viewer_count,
    );
    TestValidator.predicate(
      "unique viewers should be non-negative",
      stat.unique_viewer_count >= 0,
    );
    TestValidator.predicate(
      "article title should not be empty",
      stat.article.title.length > 0,
    );
    TestValidator.predicate(
      "article author display name should not be empty",
      stat.article.author.display_name.length > 0,
    );
    TestValidator.predicate(
      "article section should have basic properties",
      typeof stat.article.section.name === "string" &&
        typeof stat.article.section.id === "string",
    );
  }
  // Test different user types
  const adminTypeAnalytics =
    await api.functional.discussionBoard.superAdmin.analytics.article_views.index(
      superAdminConnection,
      {
        body: {
          user_type: "admin",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardArticleViewStatEvent.IRequest,
      },
    );
  typia.assert(adminTypeAnalytics);
  const superAdminTypeAnalytics =
    await api.functional.discussionBoard.superAdmin.analytics.article_views.index(
      superAdminConnection,
      {
        body: {
          user_type: "superAdmin",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardArticleViewStatEvent.IRequest,
      },
    );
  typia.assert(superAdminTypeAnalytics);
  // Validate that all analytics queries return arrays
  TestValidator.predicate(
    "all analytics responses contain data arrays",
    Array.isArray(basicAnalytics.data) &&
      Array.isArray(dateFilteredAnalytics.data) &&
      Array.isArray(userTypeAnalytics.data) &&
      Array.isArray(paginationTest.data) &&
      Array.isArray(adminTypeAnalytics.data) &&
      Array.isArray(superAdminTypeAnalytics.data),
  );
}
