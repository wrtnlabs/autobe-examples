import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test full-text search across article titles and body content using the search
 * parameter.
 *
 * This test validates keyword-based content discovery using full-text search
 * capabilities. Creates articles with specific keywords in titles and body
 * content, then performs text search queries to find matching articles.
 * Verifies that the GIN indexed search returns articles containing the search
 * terms in either title or body, results are ranked appropriately, and
 * pagination works correctly for search results.
 *
 * Test workflow:
 *
 * 1. Create moderator account and article category
 * 2. Create member account for authoring articles
 * 3. Create multiple articles with distinct keywords in titles and body
 * 4. Execute search queries for specific keywords
 * 5. Validate search results contain matching articles
 * 6. Verify pagination works correctly with search results
 */
export async function test_api_article_search_text_query(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      ip: "127.0.0.1",
      href: "https://example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create article category
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description: "Discussions about economic policies and trends",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "member123",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      ip: "127.0.0.1",
      href: "https://example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create test articles with specific keywords
  const keywords = ["inflation", "monetary", "fiscal", "trade", "employment"];
  const createdArticles: IDiscussionBoardArticle[] = [];

  // Create articles with keywords in titles
  for (const keyword of keywords.slice(0, 3)) {
    const article = await api.functional.discussionBoard.member.articles.create(
      connection,
      {
        body: {
          title: `Analysis of ${keyword} policy and its economic impact`,
          body: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 15,
            sentenceMax: 25,
          }),
          discussion_board_article_category_id: category.id,
          status: "published",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(article);
    createdArticles.push(article);
  }

  // Create articles with keywords in body content
  // Note: Body content is searched indirectly via the excerpt field,
  // which contains the first 200 characters of the body
  for (const keyword of keywords.slice(3, 5)) {
    const bodyContent = `${keyword} ${RandomGenerator.paragraph({ sentences: 10 })} ${keyword} ${RandomGenerator.paragraph({ sentences: 10 })} ${keyword} ${RandomGenerator.paragraph({ sentences: 10 })}`;
    const article = await api.functional.discussionBoard.member.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 4 }),
          body: bodyContent,
          discussion_board_article_category_id: category.id,
          status: "published",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(article);
    createdArticles.push(article);
  }

  // Create control articles without specific keywords (for negative validation)
  const controlArticles = await ArrayUtil.asyncRepeat(3, async () => {
    const article = await api.functional.discussionBoard.member.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 5 }),
          body: RandomGenerator.content({ paragraphs: 4 }),
          discussion_board_article_category_id: category.id,
          status: "published",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(article);
    return article;
  });

  // Step 5: Test search functionality for each keyword
  for (const keyword of keywords) {
    const searchResult = await api.functional.discussionBoard.articles.index(
      connection,
      {
        body: {
          search: keyword,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
    typia.assert(searchResult);

    // Validate that search returns at least one matching article
    TestValidator.predicate(
      `search for "${keyword}" should return at least one article`,
      searchResult.data.length > 0,
    );

    // Validate that returned articles contain the keyword in title or excerpt
    for (const article of searchResult.data) {
      const matchesTitle = article.title
        .toLowerCase()
        .includes(keyword.toLowerCase());
      const matchesExcerpt =
        article.excerpt !== null && article.excerpt !== undefined
          ? article.excerpt.toLowerCase().includes(keyword.toLowerCase())
          : false;

      TestValidator.predicate(
        `article "${article.title}" should contain keyword "${keyword}" in title or excerpt`,
        matchesTitle || matchesExcerpt,
      );
    }

    // Validate that control articles do NOT appear in keyword-specific searches
    const controlArticleIds = controlArticles.map((a) => a.id);
    const returnedIds = searchResult.data.map((a) => a.id);
    const hasControlArticle = returnedIds.some((id) =>
      controlArticleIds.includes(id),
    );

    TestValidator.predicate(
      `search for "${keyword}" should not return control articles without the keyword`,
      !hasControlArticle,
    );

    // Validate pagination metadata
    TestValidator.predicate(
      "pagination current page should be 1",
      searchResult.pagination.current === 1,
    );
    TestValidator.predicate(
      "pagination limit should be 10",
      searchResult.pagination.limit === 10,
    );
    TestValidator.predicate(
      "pagination records should be non-negative",
      searchResult.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages should be non-negative",
      searchResult.pagination.pages >= 0,
    );
  }

  // Step 6: Test pagination with search results
  const paginationSearchResult =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        search: keywords[0],
        page: 1,
        limit: 2,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(paginationSearchResult);

  TestValidator.predicate(
    "paginated search should respect limit parameter",
    paginationSearchResult.data.length <= 2,
  );

  // Step 7: Test empty search returns all published articles
  const allArticlesResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(allArticlesResult);

  TestValidator.predicate(
    "search without keyword should return all published articles",
    allArticlesResult.data.length >= createdArticles.length,
  );
}
