import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleViewStatEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleViewStatEvent";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test analytics capability to identify popular and engaging content accurately.
 * Create articles with deliberately varied engagement patterns - some with high view
 * counts but low engagement time, others with moderate views but high time spent,
 * and some with balanced metrics. Verify that the analytics system correctly
 * calculates and returns engagement metrics including total view counts, unique
 * viewer statistics, and average time spent. Test that the system can filter and
 * identify high-performing content based on different engagement criteria.
 */
export async function test_api_analytics_article_views_popular_content_analysis(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create sections for article organization
  const section1 = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
    {
      body: {
        name: `Section-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: 1 satisfies number as number,
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section1);
  const section2 = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
    {
      body: {
        name: `Section-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: 2 satisfies number as number,
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section2);
  // 3. Create articles with varied engagement patterns
  const articles = await Promise.all([
    // Article A: High views, low time spent
    api.functional.discussionBoard.admin.articles.create(adminConnection, {
      body: {
        title: `High Views Low Time - ${RandomGenerator.alphabets(10)}`,
        content: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: section1.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    }),
    // Article B: Moderate views, high time spent
    api.functional.discussionBoard.admin.articles.create(adminConnection, {
      body: {
        title: `Moderate Views High Time - ${RandomGenerator.alphabets(10)}`,
        content: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: section1.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    }),
    // Article C: Balanced metrics
    api.functional.discussionBoard.admin.articles.create(adminConnection, {
      body: {
        title: `Balanced Metrics - ${RandomGenerator.alphabets(10)}`,
        content: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: section2.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    }),
  ]);
  for (const article of articles) {
    typia.assert(article);
  }
  // 4. Test analytics endpoint with date range filtering
  const endDate = new Date().toISOString();
  const startDate = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const analyticsResponse =
    await api.functional.discussionBoard.admin.analytics.article_views.index(
      adminConnection,
      {
        body: {
          start_date: startDate satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">,
          end_date: endDate satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">,
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IDiscussionBoardArticleViewStatEvent.IRequest,
      },
    );
  typia.assert(analyticsResponse);
  // 5. Validate response structure (focus on data, not complex pagination)
  TestValidator.predicate(
    "analytics response has pagination",
    analyticsResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "analytics response has data array",
    Array.isArray(analyticsResponse.data),
  );
  // 6. Test section filtering
  const sectionFilteredResponse =
    await api.functional.discussionBoard.admin.analytics.article_views.index(
      adminConnection,
      {
        body: {
          section_id: section1.id,
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IDiscussionBoardArticleViewStatEvent.IRequest,
      },
    );
  typia.assert(sectionFilteredResponse);
  // 7. Test pagination with different limit
  const paginatedResponse =
    await api.functional.discussionBoard.admin.analytics.article_views.index(
      adminConnection,
      {
        body: {
          page: 1 satisfies number as number,
          limit: 2 satisfies number as number,
        } satisfies IDiscussionBoardArticleViewStatEvent.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  // 8. Validate article stats structure
  if (analyticsResponse.data.length > 0) {
    const stat = analyticsResponse.data[0];
    typia.assert(stat);
    TestValidator.predicate(
      "stat has id",
      typeof stat.id === "string" && stat.id.length > 0,
    );
    TestValidator.predicate(
      "total_view_count is number",
      typeof stat.total_view_count === "number",
    );
    TestValidator.predicate(
      "unique_viewer_count is number",
      typeof stat.unique_viewer_count === "number",
    );
    if (stat.average_time_spent_seconds !== null) {
      TestValidator.predicate(
        "average_time_spent_seconds is number",
        typeof stat.average_time_spent_seconds === "number",
      );
    }
    TestValidator.predicate(
      "article summary exists",
      stat.article !== undefined,
    );
    typia.assert(stat.article);
  }
  // 9. Test user_type filtering (optional fields)
  const userTypeResponse =
    await api.functional.discussionBoard.admin.analytics.article_views.index(
      adminConnection,
      {
        body: {
          user_type: "admin",
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IDiscussionBoardArticleViewStatEvent.IRequest,
      },
    );
  typia.assert(userTypeResponse);
}
