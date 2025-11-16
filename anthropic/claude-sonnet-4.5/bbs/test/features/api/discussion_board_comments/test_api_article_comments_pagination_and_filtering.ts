import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";

/**
 * Test advanced pagination, filtering, and sorting capabilities for article
 * comment retrieval.
 *
 * This test validates the comprehensive comment browsing functionality
 * including:
 *
 * - Pagination with various page sizes and positions
 * - Sorting by different fields (created_at, updated_at) in both directions
 * - Search/filtering by keyword content
 * - Proper pagination metadata calculation
 *
 * Workflow:
 *
 * 1. Create member account and authenticate
 * 2. Create test article
 * 3. Generate 55 comments with diverse content
 * 4. Test various pagination scenarios
 * 5. Test sorting variations
 * 6. Test search functionality
 */
export async function test_api_article_comments_pagination_and_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create member account and authenticate
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123!",
    username: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create article to host comments
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: articleData,
    },
  );
  typia.assert(article);

  // Step 3: Generate 55 diverse comments
  const commentCount = 55;
  const createdComments: IDiscussionBoardComment[] = [];

  for (let i = 0; i < commentCount; i++) {
    const commentContent = RandomGenerator.paragraph({
      sentences: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<15>
      >(),
      wordMin: 3,
      wordMax: 10,
    });

    const comment =
      await api.functional.discussionBoard.member.articles.comments.create(
        connection,
        {
          articleId: article.id,
          body: {
            content: commentContent,
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    typia.assert(comment);
    createdComments.push(comment);
  }

  // Step 4: Test pagination - first page with limit 10
  const firstPage =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(firstPage);

  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 10);
  TestValidator.equals(
    "first page records",
    firstPage.pagination.records,
    commentCount,
  );
  TestValidator.equals(
    "first page pages calculation",
    firstPage.pagination.pages,
    Math.ceil(commentCount / 10),
  );
  TestValidator.equals("first page data length", firstPage.data.length, 10);

  // Step 5: Test middle page retrieval
  const middlePage =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 3,
        limit: 10,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(middlePage);

  TestValidator.equals("middle page current", middlePage.pagination.current, 3);
  TestValidator.equals("middle page limit", middlePage.pagination.limit, 10);
  TestValidator.equals("middle page data length", middlePage.data.length, 10);

  // Step 6: Test last page retrieval
  const lastPageNum = Math.ceil(commentCount / 10);
  const lastPage = await api.functional.discussionBoard.articles.comments.index(
    connection,
    {
      articleId: article.id,
      body: {
        page: lastPageNum,
        limit: 10,
      } satisfies IDiscussionBoardComment.IRequest,
    },
  );
  typia.assert(lastPage);

  TestValidator.equals(
    "last page current",
    lastPage.pagination.current,
    lastPageNum,
  );
  TestValidator.equals("last page data length", lastPage.data.length, 5);

  // Step 7: Test different page size - 25
  const pageSize25 =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 25,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(pageSize25);

  TestValidator.equals("page size 25 limit", pageSize25.pagination.limit, 25);
  TestValidator.equals("page size 25 data length", pageSize25.data.length, 25);
  TestValidator.equals(
    "page size 25 pages",
    pageSize25.pagination.pages,
    Math.ceil(commentCount / 25),
  );

  // Step 8: Test page size 50
  const pageSize50 =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(pageSize50);

  TestValidator.equals("page size 50 data length", pageSize50.data.length, 50);

  // Step 9: Test page size 100
  const pageSize100 =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(pageSize100);

  TestValidator.equals(
    "page size 100 data length",
    pageSize100.data.length,
    commentCount,
  );

  // Step 10: Test sorting by created_at ascending
  const sortedAsc =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
        sortBy: "created_at",
        order: "asc",
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(sortedAsc);

  for (let i = 0; i < sortedAsc.data.length - 1; i++) {
    const current = new Date(sortedAsc.data[i].created_at).getTime();
    const next = new Date(sortedAsc.data[i + 1].created_at).getTime();
    TestValidator.predicate("ascending sort order", current <= next);
  }

  // Step 11: Test sorting by created_at descending
  const sortedDesc =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
        sortBy: "created_at",
        order: "desc",
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(sortedDesc);

  for (let i = 0; i < sortedDesc.data.length - 1; i++) {
    const current = new Date(sortedDesc.data[i].created_at).getTime();
    const next = new Date(sortedDesc.data[i + 1].created_at).getTime();
    TestValidator.predicate("descending sort order", current >= next);
  }

  // Step 12: Test sorting by updated_at
  const sortedByUpdated =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
        sortBy: "updated_at",
        order: "desc",
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(sortedByUpdated);

  for (let i = 0; i < sortedByUpdated.data.length - 1; i++) {
    const current = new Date(sortedByUpdated.data[i].updated_at).getTime();
    const next = new Date(sortedByUpdated.data[i + 1].updated_at).getTime();
    TestValidator.predicate("updated_at sort order", current >= next);
  }

  // Step 13: Test search functionality
  const sampleComment = RandomGenerator.pick(createdComments);
  let searchKeyword = RandomGenerator.substring(sampleComment.content);

  // Ensure search keyword has reasonable length (at least 3 characters)
  if (searchKeyword.length < 3) {
    // Fallback to first word of sample comment if substring is too short
    const words = sampleComment.content.split(" ").filter((w) => w.length >= 3);
    searchKeyword =
      words.length > 0
        ? RandomGenerator.pick(words)
        : sampleComment.content.substring(0, 5);
  }

  const searchResults =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 100,
        search: searchKeyword,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(searchResults);

  TestValidator.predicate(
    "search results not empty",
    searchResults.data.length > 0,
  );

  const allContainKeyword = searchResults.data.every((comment) =>
    comment.content.includes(searchKeyword),
  );
  TestValidator.predicate(
    "all search results contain keyword",
    allContainKeyword,
  );
}
