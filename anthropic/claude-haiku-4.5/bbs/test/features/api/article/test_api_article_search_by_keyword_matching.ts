import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

export async function test_api_article_search_by_keyword_matching(
  connection: api.IConnection,
) {
  // Register a member account to author test articles
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(member);

  // Create multiple test articles with diverse keywords
  const economicsKeywords = ["inflation", "monetary policy", "trade"];
  const politicsKeywords = ["government", "election", "legislation"];

  const articles: IDiscussionBoardArticle[] = [];

  // Create Economics articles
  for (const keyword of economicsKeywords) {
    const article = await api.functional.discussionBoard.member.articles.create(
      connection,
      {
        body: {
          title: `Economics Analysis: ${keyword} Impact`,
          content: `This article discusses the effects of ${keyword} on economic markets and consumer behavior. ${RandomGenerator.content({ paragraphs: 3 })}`,
          category_code: "economics",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(article);
    articles.push(article);
  }

  // Create Politics articles
  for (const keyword of politicsKeywords) {
    const article = await api.functional.discussionBoard.member.articles.create(
      connection,
      {
        body: {
          title: `Political Discussion: ${keyword} in Modern Society`,
          content: `An in-depth analysis of ${keyword} and its implications. ${RandomGenerator.content({ paragraphs: 3 })}`,
          category_code: "politics",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(article);
    articles.push(article);
  }

  // Test 1: Search by keyword in title
  const inflationSearch =
    await api.functional.discussionBoard.search.articles.index(connection, {
      body: {
        search: "inflation",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(inflationSearch);
  TestValidator.predicate(
    "search results should contain articles with inflation keyword",
    inflationSearch.data.length > 0,
  );
  TestValidator.predicate(
    "inflation article should appear in results",
    inflationSearch.data.some((art) =>
      art.title.toLowerCase().includes("inflation"),
    ),
  );

  // Test 2: Search by keyword in content
  const contentSearch =
    await api.functional.discussionBoard.search.articles.index(connection, {
      body: {
        search: "election",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(contentSearch);
  TestValidator.predicate(
    "election search should return political articles",
    contentSearch.data.length > 0,
  );

  // Test 3: Search with category filter
  const categoryFilter =
    await api.functional.discussionBoard.search.articles.index(connection, {
      body: {
        search: "policy",
        category: "economics",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(categoryFilter);

  // Test 4: Search with author filter
  const authorFilter =
    await api.functional.discussionBoard.search.articles.index(connection, {
      body: {
        author_id: member.id,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(authorFilter);
  TestValidator.equals(
    "all results should be from the test member",
    authorFilter.data.every((art) => art.author.id === member.id),
    true,
  );

  // Test 5: Pagination
  const page1 = await api.functional.discussionBoard.search.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.predicate(
    "page 1 should return limited results",
    page1.data.length <= 2,
  );
  TestValidator.predicate(
    "pagination info should be correct",
    page1.pagination.current === 1 && page1.pagination.limit === 2,
  );

  // Test 6: Search result metadata validation
  const metadataSearch =
    await api.functional.discussionBoard.search.articles.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(metadataSearch);

  if (metadataSearch.data.length > 0) {
    const firstResult = metadataSearch.data[0];
    TestValidator.predicate(
      "article summary should have id",
      firstResult.id !== undefined && firstResult.id.length > 0,
    );
    TestValidator.predicate(
      "article summary should have title",
      firstResult.title !== undefined && firstResult.title.length > 0,
    );
    TestValidator.predicate(
      "article summary should have author",
      firstResult.author !== undefined,
    );
    TestValidator.predicate(
      "article summary should have creation date",
      firstResult.createdAt !== undefined,
    );
    TestValidator.predicate(
      "article summary should have category",
      firstResult.category !== undefined,
    );
    TestValidator.predicate(
      "article summary should have view count",
      firstResult.viewCount !== undefined,
    );
    TestValidator.predicate(
      "article summary should have comment count",
      firstResult.commentCount !== undefined,
    );
  }

  // Test 7: Empty search results
  const noResultsSearch =
    await api.functional.discussionBoard.search.articles.index(connection, {
      body: {
        search: "nonexistentkeywor123456789",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(noResultsSearch);
  TestValidator.equals(
    "search with no matching keywords should return empty results",
    noResultsSearch.data.length,
    0,
  );

  // Test 8: Search visibility - only published articles visible
  const visibilitySearch =
    await api.functional.discussionBoard.search.articles.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(visibilitySearch);
  TestValidator.predicate(
    "all returned articles should be published",
    visibilitySearch.data.every((art) => art.status === "published"),
  );
}
