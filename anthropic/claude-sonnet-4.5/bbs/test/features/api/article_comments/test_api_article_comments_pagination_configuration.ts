import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";

/**
 * Test pagination configuration with different page sizes and page numbers.
 *
 * This test validates that the pagination system works correctly for articles
 * with many comments. Creates an article with more comments than a single page
 * can hold (35 comments with default 20 per page), then retrieves comments with
 * different page sizes and navigates through pages.
 *
 * Verifies that the total count, page count, current page, and returned comment
 * array are correct. Tests edge cases like requesting a page beyond available
 * pages and requesting the last page with fewer items than page size.
 */
export async function test_api_article_comments_pagination_configuration(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authoring article and comments
  const memberJoinData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberJoinData,
    });
  typia.assert(member);

  // Step 2: Create category required for article creation
  const categoryData = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create article to hold many comments for pagination testing
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    category_ids: [category.id],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 4: Create 35 comments on the article (exceeding single page default of 20)
  const totalComments = 35;
  const createdComments: IDiscussionBoardComment[] =
    await ArrayUtil.asyncRepeat(totalComments, async (index) => {
      const commentData = {
        discussion_board_article_id: article.id,
        discussion_board_parent_comment_id: null,
        content: `Test comment ${index + 1}: ${RandomGenerator.paragraph({ sentences: 3 })}`,
      } satisfies IDiscussionBoardComment.ICreate;

      const comment: IDiscussionBoardComment =
        await api.functional.discussionBoard.member.articles.comments.create(
          connection,
          {
            articleId: article.id,
            body: commentData,
          },
        );
      typia.assert(comment);
      return comment;
    });

  // Step 5: Test default pagination (page 1, default limit 20)
  const defaultPage1Request = {
    discussion_board_article_id: article.id,
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardComment.IRequest;

  const defaultPage1: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: defaultPage1Request,
    });
  typia.assert(defaultPage1);

  TestValidator.equals(
    "default page 1 data length",
    defaultPage1.data.length,
    20,
  );
  TestValidator.equals(
    "default page 1 total records",
    defaultPage1.pagination.records,
    totalComments,
  );
  TestValidator.equals(
    "default page 1 current page",
    defaultPage1.pagination.current,
    1,
  );
  TestValidator.equals(
    "default page 1 limit",
    defaultPage1.pagination.limit,
    20,
  );
  TestValidator.equals(
    "default page 1 total pages",
    defaultPage1.pagination.pages,
    2,
  );

  // Step 6: Test second page (page 2, limit 20) - verify remaining 15 comments returned
  const defaultPage2Request = {
    discussion_board_article_id: article.id,
    page: 2,
    limit: 20,
  } satisfies IDiscussionBoardComment.IRequest;

  const defaultPage2: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: defaultPage2Request,
    });
  typia.assert(defaultPage2);

  TestValidator.equals("page 2 data length", defaultPage2.data.length, 15);
  TestValidator.equals(
    "page 2 total records",
    defaultPage2.pagination.records,
    totalComments,
  );
  TestValidator.equals(
    "page 2 current page",
    defaultPage2.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", defaultPage2.pagination.limit, 20);
  TestValidator.equals("page 2 total pages", defaultPage2.pagination.pages, 2);

  // Step 7: Test custom page size (page 1, limit 10)
  const customLimit10Request = {
    discussion_board_article_id: article.id,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardComment.IRequest;

  const customLimit10Page1: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: customLimit10Request,
    });
  typia.assert(customLimit10Page1);

  TestValidator.equals(
    "custom limit 10 page 1 data length",
    customLimit10Page1.data.length,
    10,
  );
  TestValidator.equals(
    "custom limit 10 total records",
    customLimit10Page1.pagination.records,
    totalComments,
  );
  TestValidator.equals(
    "custom limit 10 current page",
    customLimit10Page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "custom limit 10 limit",
    customLimit10Page1.pagination.limit,
    10,
  );
  TestValidator.equals(
    "custom limit 10 total pages",
    customLimit10Page1.pagination.pages,
    4,
  );

  // Step 8: Test last page with custom limit - verify correct handling when remaining items < limit
  const lastPageRequest = {
    discussion_board_article_id: article.id,
    page: 4,
    limit: 10,
  } satisfies IDiscussionBoardComment.IRequest;

  const lastPage: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: lastPageRequest,
    });
  typia.assert(lastPage);

  TestValidator.equals("last page data length", lastPage.data.length, 5);
  TestValidator.equals(
    "last page total records",
    lastPage.pagination.records,
    totalComments,
  );
  TestValidator.equals(
    "last page current page",
    lastPage.pagination.current,
    4,
  );
  TestValidator.equals("last page limit", lastPage.pagination.limit, 10);
  TestValidator.equals("last page total pages", lastPage.pagination.pages, 4);

  // Step 9: Test requesting page beyond available pages
  const beyondPagesRequest = {
    discussion_board_article_id: article.id,
    page: 10,
    limit: 20,
  } satisfies IDiscussionBoardComment.IRequest;

  const beyondPages: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: beyondPagesRequest,
    });
  typia.assert(beyondPages);

  TestValidator.equals("beyond pages data length", beyondPages.data.length, 0);
  TestValidator.equals(
    "beyond pages total records",
    beyondPages.pagination.records,
    totalComments,
  );
  TestValidator.equals(
    "beyond pages current page",
    beyondPages.pagination.current,
    10,
  );
  TestValidator.equals(
    "beyond pages total pages",
    beyondPages.pagination.pages,
    2,
  );
}
