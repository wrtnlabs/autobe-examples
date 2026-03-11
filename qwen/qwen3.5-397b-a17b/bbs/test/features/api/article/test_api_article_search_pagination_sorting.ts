import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

/**
 * Test article search pagination and sorting functionality.
 *
 * This test validates:
 * 1. Member authentication and article creation
 * 2. Pagination with limit and page parameters
 * 3. Pagination metadata accuracy (current, limit, records, pages)
 * 4. Sorting by 'newest' (created_at DESC)
 * 5. Sorting by 'oldest' (created_at ASC)
 * 6. Default sorting behavior (newest)
 * 7. Edge case: page beyond total pages returns empty data
 */
export async function test_api_article_search_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create 12 articles for pagination testing
  const articles: IDiscussionBoardArticle[] = await ArrayUtil.asyncRepeat(
    12,
    async (index) => {
      // Add small delay between article creations to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));
      return await generate_random_discussion_board_member_articles_create(
        memberConnection,
        {
          body: {
            title: `Test Article ${index + 1}`,
            content: RandomGenerator.content({ paragraphs: 2 }),
          },
        },
      );
    },
  );
  // Verify all articles were created
  TestValidator.equals("articles created count", articles.length, 12);
  articles.forEach((article) => typia.assert(article));
  // 3. Test pagination - Page 1 with limit=5
  const page1Result =
    await api.functional.discussionBoard.member.articles.search(
      memberConnection,
      {
        body: {
          limit: 5,
          page: 1,
          sort: "newest",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(page1Result);
  TestValidator.equals("page 1 current", page1Result.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 5);
  TestValidator.equals("page 1 records", page1Result.pagination.records, 12);
  TestValidator.equals("page 1 pages", page1Result.pagination.pages, 3);
  TestValidator.equals("page 1 data length", page1Result.data.length, 5);
  // 4. Test pagination - Page 2 with limit=5
  const page2Result =
    await api.functional.discussionBoard.member.articles.search(
      memberConnection,
      {
        body: {
          limit: 5,
          page: 2,
          sort: "newest",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 5);
  TestValidator.equals("page 2 records", page2Result.pagination.records, 12);
  TestValidator.equals("page 2 pages", page2Result.pagination.pages, 3);
  TestValidator.equals("page 2 data length", page2Result.data.length, 5);
  // 5. Test pagination - Page 3 with limit=5 (last page with 2 articles)
  const page3Result =
    await api.functional.discussionBoard.member.articles.search(
      memberConnection,
      {
        body: {
          limit: 5,
          page: 3,
          sort: "newest",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(page3Result);
  TestValidator.equals("page 3 current", page3Result.pagination.current, 3);
  TestValidator.equals("page 3 limit", page3Result.pagination.limit, 5);
  TestValidator.equals("page 3 records", page3Result.pagination.records, 12);
  TestValidator.equals("page 3 pages", page3Result.pagination.pages, 3);
  TestValidator.equals("page 3 data length", page3Result.data.length, 2);
  // 6. Test sorting by 'newest' (most recent first)
  const newestResult =
    await api.functional.discussionBoard.member.articles.search(
      memberConnection,
      {
        body: {
          limit: 12,
          page: 1,
          sort: "newest",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(newestResult);
  TestValidator.equals("newest result count", newestResult.data.length, 12);
  // Verify newest sorting: first article should be most recent (last created)
  // Last created article is articles[11]
  TestValidator.equals(
    "newest first article",
    newestResult.data[0]?.id,
    articles[11]?.id,
  );
  // Verify newest sorting: last article should be oldest (first created)
  TestValidator.equals(
    "newest last article",
    newestResult.data[11]?.id,
    articles[0]?.id,
  );
  // 7. Test sorting by 'oldest' (earliest first)
  const oldestResult =
    await api.functional.discussionBoard.member.articles.search(
      memberConnection,
      {
        body: {
          limit: 12,
          page: 1,
          sort: "oldest",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(oldestResult);
  TestValidator.equals("oldest result count", oldestResult.data.length, 12);
  // Verify oldest sorting: first article should be oldest (first created)
  TestValidator.equals(
    "oldest first article",
    oldestResult.data[0]?.id,
    articles[0]?.id,
  );
  // Verify oldest sorting: last article should be most recent (last created)
  TestValidator.equals(
    "oldest last article",
    oldestResult.data[11]?.id,
    articles[11]?.id,
  );
  // 8. Test default sorting (should be 'newest' when sort is not specified)
  const defaultResult =
    await api.functional.discussionBoard.member.articles.search(
      memberConnection,
      {
        body: {
          limit: 12,
          page: 1,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(defaultResult);
  TestValidator.equals("default result count", defaultResult.data.length, 12);
  // Default should match newest sorting
  TestValidator.equals(
    "default first article matches newest",
    defaultResult.data[0]?.id,
    newestResult.data[0]?.id,
  );
  // 9. Test page beyond total pages (page=10 when total pages=3)
  const beyondPagesResult =
    await api.functional.discussionBoard.member.articles.search(
      memberConnection,
      {
        body: {
          limit: 5,
          page: 10,
          sort: "newest",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(beyondPagesResult);
  TestValidator.equals(
    "beyond pages current",
    beyondPagesResult.pagination.current,
    10,
  );
  TestValidator.equals(
    "beyond pages limit",
    beyondPagesResult.pagination.limit,
    5,
  );
  TestValidator.equals(
    "beyond pages records",
    beyondPagesResult.pagination.records,
    12,
  );
  TestValidator.equals(
    "beyond pages pages",
    beyondPagesResult.pagination.pages,
    3,
  );
  TestValidator.equals(
    "beyond pages data length",
    beyondPagesResult.data.length,
    0,
  );
}
