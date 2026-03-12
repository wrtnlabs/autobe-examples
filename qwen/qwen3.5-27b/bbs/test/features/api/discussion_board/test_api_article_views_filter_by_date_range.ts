import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleView } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleView";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleView } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleView";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test article views filtering by date range for engagement analytics.
 *
 * This test validates that administrators can filter article view events
 * by date range to analyze viewing patterns over time. The test verifies:
 * - Date range filtering with viewedAtFrom and viewedAtTo parameters
 * - Pagination works correctly with filtered results
 * - Sort order (ascending) returns oldest views first
 * - All returned views fall within the specified date range
 */
export async function test_api_article_views_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin/login",
      referrer: "https://test.com",
    } satisfies IDiscussionBoardAdministrator.ILogin,
  });
  // 2. Create a section for the article
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: "Test Section for Views",
          description: "Section for testing article view analytics",
        },
      },
    );
  typia.assert(section);
  // 3. Create an article in the section
  const article = await generate_random_discussion_board_member_articles_create(
    adminConnection,
    {
      body: {
        title: "Test Article for View Analytics",
        content:
          "This article is created for testing view filtering by date range.",
        section_id: section.id,
        tags: ["analytics", "testing"],
      },
    },
  );
  typia.assert(article);
  // 4. Prepare date range filter parameters
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  // 5. Call views endpoint with date range filter (ascending order)
  const viewsResponse =
    await api.functional.discussionBoard.administrator.articles.views.index(
      adminConnection,
      {
        articleId: article.id,
        body: {
          viewedAtFrom: twoDaysAgo.toISOString(),
          viewedAtTo: now.toISOString(),
          page: 1,
          pageSize: 20,
          sortOrder: "asc",
        } satisfies IDiscussionBoardArticleView.IRequest,
      },
    );
  typia.assert(viewsResponse);
  // 6. Verify pagination information
  TestValidator.equals(
    "pagination current page",
    viewsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    viewsResponse.pagination.limit >= 1 &&
      viewsResponse.pagination.limit <= 100,
  );
  // 7. Verify all returned views fall within the date range
  await ArrayUtil.asyncForEach(viewsResponse.data, async (view) => {
    typia.assert(view);
    const viewDate = new Date(view.viewed_at);
    const fromDate = new Date(twoDaysAgo.toISOString());
    const toDate = new Date(now.toISOString());
    TestValidator.predicate(
      `view ${view.id} is within date range (from)`,
      viewDate >= fromDate,
    );
    TestValidator.predicate(
      `view ${view.id} is within date range (to)`,
      viewDate <= toDate,
    );
  });
  // 8. Verify ascending sort order (oldest first)
  if (viewsResponse.data.length > 1) {
    for (let i = 1; i < viewsResponse.data.length; i++) {
      const prevView = viewsResponse.data[i - 1];
      const currView = viewsResponse.data[i];
      typia.assert(prevView);
      typia.assert(currView);
      TestValidator.predicate(
        `views are sorted ascending (index ${i - 1} to ${i})`,
        new Date(prevView.viewed_at) <= new Date(currView.viewed_at),
      );
    }
  }
  // 9. Verify all views belong to the correct article
  await ArrayUtil.asyncForEach(viewsResponse.data, async (view) => {
    typia.assert(view);
    TestValidator.equals(
      `view ${view.id} belongs to correct article`,
      view.article.id,
      article.id,
    );
  });
  // 10. Test pagination with page 2
  const viewsPage2 =
    await api.functional.discussionBoard.administrator.articles.views.index(
      adminConnection,
      {
        articleId: article.id,
        body: {
          viewedAtFrom: twoDaysAgo.toISOString(),
          viewedAtTo: now.toISOString(),
          page: 2,
          pageSize: 10,
          sortOrder: "asc",
        } satisfies IDiscussionBoardArticleView.IRequest,
      },
    );
  typia.assert(viewsPage2);
  TestValidator.equals(
    "page 2 pagination current",
    viewsPage2.pagination.current,
    2,
  );
  // 11. Verify page 2 also respects date range
  await ArrayUtil.asyncForEach(viewsPage2.data, async (view) => {
    typia.assert(view);
    const viewDate = new Date(view.viewed_at);
    const fromDate = new Date(twoDaysAgo.toISOString());
    const toDate = new Date(now.toISOString());
    TestValidator.predicate(
      `page 2 view ${view.id} is within date range (from)`,
      viewDate >= fromDate,
    );
    TestValidator.predicate(
      `page 2 view ${view.id} is within date range (to)`,
      viewDate <= toDate,
    );
  });
}
