import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardCommentAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAnalytic";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_sections_articles_create } from "../../../generate/generate_random_discussion_board_admin_sections_articles_create";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_comment_analytics_filter_combinations(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.admin.join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // Setup: Create section
  const section = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
    {
      body: typia.random<IDiscussionBoardSection.ICreate>(),
    },
  );
  typia.assert(section);
  // Setup: Create articles in the section
  const articles: IDiscussionBoardArticle[] = [];
  for (let i = 0; i < 3; i++) {
    const article =
      await api.functional.discussionBoard.admin.sections.articles.create(
        adminConnection,
        {
          sectionId: (section as any).id,
          body: typia.random<IDiscussionBoardArticle.ICreate>(),
        },
      );
    articles.push(article);
    typia.assert(article);
  }
  // Test: Analytics query with no filters (should return analytics for all comments)
  const analyticsAll =
    await api.functional.discussionBoard.admin.analytics.comments.submitCommentAnalytics(
      adminConnection,
      {
        body: typia.random<IDiscussionBoardCommentAnalytic.IRequest>(),
      },
    );
  typia.assert(analyticsAll);
  // Test: Analytics query with section ID filter
  const analyticsBySection =
    await api.functional.discussionBoard.admin.analytics.comments.submitCommentAnalytics(
      adminConnection,
      {
        body: {
          section_id: (section as any).id,
        } satisfies IDiscussionBoardCommentAnalytic.IRequest,
      },
    );
  typia.assert(analyticsBySection);
  // Test: Analytics query with article ID filter
  const analyticsByArticle =
    await api.functional.discussionBoard.admin.analytics.comments.submitCommentAnalytics(
      adminConnection,
      {
        body: {
          article_id: (articles[0] as any).id,
        } satisfies IDiscussionBoardCommentAnalytic.IRequest,
      },
    );
  typia.assert(analyticsByArticle);
  // Test: Analytics query with date range filter
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const analyticsByDate =
    await api.functional.discussionBoard.admin.analytics.comments.submitCommentAnalytics(
      adminConnection,
      {
        body: {
          created_at_from: new Date(now.getTime() - oneDay).toISOString(),
          created_at_to: now.toISOString(),
        } satisfies IDiscussionBoardCommentAnalytic.IRequest,
      },
    );
  typia.assert(analyticsByDate);
  // Test: Analytics query with complex filter combination
  const analyticsComplex =
    await api.functional.discussionBoard.admin.analytics.comments.submitCommentAnalytics(
      adminConnection,
      {
        body: {
          section_id: (section as any).id,
          article_id: (articles[0] as any).id,
          created_at_from: new Date(now.getTime() - oneDay).toISOString(),
        } satisfies IDiscussionBoardCommentAnalytic.IRequest,
      },
    );
  typia.assert(analyticsComplex);
  // Test: Analytics query with invalid section ID (should return empty or error)
  const analyticsInvalidSection =
    await api.functional.discussionBoard.admin.analytics.comments.submitCommentAnalytics(
      adminConnection,
      {
        body: {
          section_id: "invalid-section-id",
        } satisfies IDiscussionBoardCommentAnalytic.IRequest,
      },
    );
  typia.assert(analyticsInvalidSection);
}