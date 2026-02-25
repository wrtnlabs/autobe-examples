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

export async function test_api_analytics_article_views_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
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
  // Create sections
  const sections = [];
  const sectionNames = ["Politics", "Economy", "Current Affairs"] as const;
  for (let i = 0; i < 3; i++) {
    const section =
      await generate_random_discussion_board_admin_sections_create(
        adminConnection,
        {
          body: {
            name: sectionNames[i],
            description: RandomGenerator.paragraph({ sentences: 3 }),
            status: "active",
            display_order: i,
          } satisfies IDiscussionBoardSection.ICreate,
        },
      );
    typia.assert(section);
    sections.push(section);
  }
  // Create articles in each section
  const articles = [];
  for (let i = 0; i < 9; i++) {
    const sectionIndex = i % 3;
    const article =
      await generate_random_discussion_board_admin_articles_create(
        adminConnection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 2 }),
            content: RandomGenerator.content({ paragraphs: 2 }),
            discussion_board_section_id: sections[sectionIndex].id,
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    typia.assert(article);
    articles.push(article);
  }
  // Test date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateFilteredAnalytics =
    await api.functional.discussionBoard.admin.analytics.article_views.index(
      adminConnection,
      {
        body: {
          start_date: oneWeekAgo.toISOString(),
          end_date: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleViewStatEvent.IRequest,
      },
    );
  typia.assert(dateFilteredAnalytics);
  // Test section filtering
  const sectionFilteredAnalytics =
    await api.functional.discussionBoard.admin.analytics.article_views.index(
      adminConnection,
      {
        body: {
          section_id: sections[0].id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleViewStatEvent.IRequest,
      },
    );
  typia.assert(sectionFilteredAnalytics);
  // Test user type filtering
  const userTypeFilteredAnalytics =
    await api.functional.discussionBoard.admin.analytics.article_views.index(
      adminConnection,
      {
        body: {
          user_type: "admin",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleViewStatEvent.IRequest,
      },
    );
  typia.assert(userTypeFilteredAnalytics);
  // Test pagination
  const paginatedAnalytics =
    await api.functional.discussionBoard.admin.analytics.article_views.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardArticleViewStatEvent.IRequest,
      },
    );
  typia.assert(paginatedAnalytics);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination data length should be <= limit",
    paginatedAnalytics.data.length <= 5,
  );
  // Access the deeply nested pagination properties
  const actualPagination =
    paginatedAnalytics.pagination?.pagination?.pagination?.pagination;
  TestValidator.predicate(
    "pagination should have valid page info",
    actualPagination?.current === 1,
  );
  TestValidator.predicate(
    "pagination should have valid limit",
    actualPagination?.limit === 5,
  );
  // Validate analytics data structure
  if (dateFilteredAnalytics.data.length > 0) {
    const stat = dateFilteredAnalytics.data[0];
    TestValidator.predicate(
      "should have total view count",
      stat.total_view_count >= 0,
    );
    TestValidator.predicate(
      "should have unique viewer count",
      stat.unique_viewer_count >= 0,
    );
    TestValidator.predicate(
      "should have article metadata",
      stat.article !== undefined,
    );
    TestValidator.predicate(
      "article should have title",
      stat.article.title.length > 0,
    );
    TestValidator.predicate(
      "article should have author",
      stat.article.author !== undefined,
    );
    TestValidator.predicate(
      "article should have section",
      stat.article.section !== undefined,
    );
  }
}
