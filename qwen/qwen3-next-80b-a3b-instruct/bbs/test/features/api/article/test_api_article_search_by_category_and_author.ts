import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardArticleStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleStatus";
import type { IDiscussionBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCitizen";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_article_search_by_category_and_author(
  connection: api.IConnection,
): Promise<void> {
  // Create connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
  } satisfies IDiscussionBoardUser.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(member);
  // Perform initial unfiltered search to retrieve existing articles
  const initialSearch = await api.functional.discussionBoard.posts.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(initialSearch);
  // If no articles exist, we cannot proceed, but we'll assume at least one exists
  if (initialSearch.data.length === 0) {
    throw new Error("No articles available for testing");
  }
  // Extract a valid category_id and author_id from the first article
  const firstArticle = initialSearch.data[0];
  const categoryId = firstArticle.category?.id;
  const authorId = firstArticle.author.id;
  // Verify we have both values
  if (!categoryId || !authorId) {
    throw new Error("First article must have category and author information");
  }
  // Test search with category_id and author_id filters
  const searchByCategoryAndAuthor =
    await api.functional.discussionBoard.posts.index(memberConnection, {
      body: {
        category_id: categoryId,
        author_id: authorId,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchByCategoryAndAuthor);
  // Verify results contain all articles matching both criteria
  for (const article of searchByCategoryAndAuthor.data) {
    TestValidator.equals(
      "all articles in result have correct category",
      article.category?.id,
      categoryId,
    );
    TestValidator.equals(
      "all articles in result have correct author",
      article.author.id,
      authorId,
    );
  }
  // Test search with non-existent category_id (should return 0 results)
  const nonExistentCategoryId = "00000000-0000-0000-0000-000000000000";
  const searchNonExistentCategory =
    await api.functional.discussionBoard.posts.index(memberConnection, {
      body: {
        category_id: nonExistentCategoryId,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchNonExistentCategory);
  TestValidator.equals(
    "search with non-existent category returns 0 results",
    searchNonExistentCategory.data.length,
    0,
  );
  // Test search with non-existent author_id (should return 0 results)
  const nonExistentAuthorId = "00000000-0000-0000-0000-000000000000";
  const searchNonExistentAuthor =
    await api.functional.discussionBoard.posts.index(memberConnection, {
      body: {
        author_id: nonExistentAuthorId,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchNonExistentAuthor);
  TestValidator.equals(
    "search with non-existent author returns 0 results",
    searchNonExistentAuthor.data.length,
    0,
  );
  // Test search with both non-existent category and author (should return 0 results)
  const searchNonExistentBoth =
    await api.functional.discussionBoard.posts.index(memberConnection, {
      body: {
        category_id: nonExistentCategoryId,
        author_id: nonExistentAuthorId,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchNonExistentBoth);
  TestValidator.equals(
    "search with both non-existent category and author returns 0 results",
    searchNonExistentBoth.data.length,
    0,
  );
  // Test search with valid author and non-existent category (should return 0 results)
  const searchValidAuthorNonExistentCategory =
    await api.functional.discussionBoard.posts.index(memberConnection, {
      body: {
        category_id: nonExistentCategoryId,
        author_id: authorId,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchValidAuthorNonExistentCategory);
  TestValidator.equals(
    "search with valid author and non-existent category returns 0 results",
    searchValidAuthorNonExistentCategory.data.length,
    0,
  );
  // Test search with valid category and non-existent author (should return 0 results)
  const searchValidCategoryNonExistentAuthor =
    await api.functional.discussionBoard.posts.index(memberConnection, {
      body: {
        category_id: categoryId,
        author_id: nonExistentAuthorId,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchValidCategoryNonExistentAuthor);
  TestValidator.equals(
    "search with valid category and non-existent author returns 0 results",
    searchValidCategoryNonExistentAuthor.data.length,
    0,
  );
  // Test pagination with limit 1 and page 1, 2
  const firstPage = await api.functional.discussionBoard.posts.index(
    memberConnection,
    {
      body: {
        author_id: authorId,
        category_id: categoryId,
        page: 1,
        limit: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page returns exactly one article",
    firstPage.data.length,
    1,
  );
  TestValidator.equals(
    "first page article id matches",
    firstPage.data[0].id,
    firstArticle.id,
  );
  const secondPage = await api.functional.discussionBoard.posts.index(
    memberConnection,
    {
      body: {
        author_id: authorId,
        category_id: categoryId,
        page: 2,
        limit: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(secondPage);
  TestValidator.equals(
    "second page returns exactly one article",
    secondPage.data.length,
    1,
  );
  // Test sort by created_at
  const sortedByCreatedAt = await api.functional.discussionBoard.posts.index(
    memberConnection,
    {
      body: {
        author_id: authorId,
        category_id: categoryId,
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(sortedByCreatedAt);
  TestValidator.predicate(
    "sorted by created_at has different order than default",
    sortedByCreatedAt.data[0].created_at !== firstPage.data[0].created_at,
  );
  // Test that the author and category info are included in response
  for (const article of searchByCategoryAndAuthor.data) {
    TestValidator.equals(
      "article has author info",
      article.author.id,
      authorId,
    );
    TestValidator.equals(
      "article has category info",
      article.category?.id,
      categoryId,
    );
    TestValidator.predicate("article has title", article.title.length > 0);
    TestValidator.predicate("article has content", article.content.length > 0);
  }
}
