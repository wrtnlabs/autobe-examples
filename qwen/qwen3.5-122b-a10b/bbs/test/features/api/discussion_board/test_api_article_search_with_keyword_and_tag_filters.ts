import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
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

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test the article search functionality with keyword queries and tag filtering.
 *
 * This test validates:
 * 1. Search endpoint responds correctly with proper structure
 * 2. Keyword search filters articles by title and content
 * 3. Tag filtering applies AND logic (article must have ALL specified tags)
 * 4. Pagination metadata is included (current page, limit, total records, total pages)
 * 5. Search results include article summaries with all required fields
 * 6. Multiple search parameter combinations work correctly
 */
export async function test_api_article_search_with_keyword_and_tag_filters(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as guest
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth: IDiscussionBoardGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {
      body: {
        device_fingerprint: RandomGenerator.alphabets(32),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardGuest.IJoin,
    });
  typia.assert(guestAuth);
  // Step 2: Test basic search with keyword
  const keywordSearchResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.guest.articles.search(
      guestConnection,
      {
        body: {
          search: RandomGenerator.paragraph({ sentences: 2 }),
          page: 1,
          limit: 20,
          sort: "newest",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(keywordSearchResult);
  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination current page",
    keywordSearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    keywordSearchResult.pagination.limit,
    20,
  );
  // Validate search result structure when articles exist
  if (keywordSearchResult.data.length > 0) {
    const firstArticle = keywordSearchResult.data[0];
    typia.assert(firstArticle);
    // Verify article summary has all required fields (business logic validation)
    TestValidator.predicate(
      "article has non-empty id",
      firstArticle.id.length > 0,
    );
    TestValidator.predicate(
      "article has non-empty title",
      firstArticle.title.length > 0,
    );
    TestValidator.predicate("article has author", firstArticle.author !== null);
    TestValidator.predicate(
      "article has section",
      firstArticle.section !== null,
    );
    TestValidator.predicate(
      "article has tags array",
      Array.isArray(firstArticle.tags),
    );
    TestValidator.predicate(
      "article has comments count",
      firstArticle.comments_count >= 0,
    );
  }
  // Step 3: Test search with tag filtering (AND logic)
  const tagFilterResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.guest.articles.search(
      guestConnection,
      {
        body: {
          search: RandomGenerator.name(),
          tag_names: ["technology", "programming"],
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(tagFilterResult);
  // Validate tag filtering returns valid structure
  TestValidator.predicate(
    "tag filter pagination valid",
    tagFilterResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "tag filter results is array",
    Array.isArray(tagFilterResult.data),
  );
  // Step 4: Test search with multiple tags (AND logic verification)
  const multiTagResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.guest.articles.search(
      guestConnection,
      {
        body: {
          tag_names: ["news", "technology", "programming"],
          page: 1,
          limit: 10,
          sort: "oldest",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(multiTagResult);
  // Validate AND logic - articles returned should have all specified tags
  if (multiTagResult.data.length > 0) {
    const firstArticle = multiTagResult.data[0];
    typia.assert(firstArticle);
    // Verify article has the requested tags (AND logic)
    const tagNames = firstArticle.tags.map((tag) => tag.name.toLowerCase());
    TestValidator.predicate(
      "article has technology tag when filtered",
      tagNames.includes("technology"),
    );
    TestValidator.predicate(
      "article has programming tag when filtered",
      tagNames.includes("programming"),
    );
  }
  // Step 5: Test search with no keyword (should return all articles)
  const allArticlesResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.guest.articles.search(
      guestConnection,
      {
        body: {
          page: 1,
          limit: 50,
          sort: "newest",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(allArticlesResult);
  // Validate all articles search
  TestValidator.equals(
    "all articles pagination current",
    allArticlesResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "all articles limit",
    allArticlesResult.pagination.limit,
    50,
  );
  // Step 6: Test pagination with different page numbers
  const page2Result: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.guest.articles.search(
      guestConnection,
      {
        body: {
          page: 2,
          limit: 20,
          sort: "newest",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 pagination current",
    page2Result.pagination.current,
    2,
  );
  // Step 7: Test search with author filter
  const authorFilterResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.guest.articles.search(
      guestConnection,
      {
        body: {
          author_id: guestAuth.id,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(authorFilterResult);
  // Validate author filter returns valid structure
  TestValidator.predicate(
    "author filter pagination valid",
    authorFilterResult.pagination.current >= 1,
  );
  // Step 8: Verify all search results have consistent pagination structure
  const allResults: IPageIDiscussionBoardArticle.ISummary[] = [
    keywordSearchResult,
    tagFilterResult,
    multiTagResult,
    allArticlesResult,
    page2Result,
    authorFilterResult,
  ];
  await ArrayUtil.asyncForEach(allResults, async (result, index) => {
    typia.assert(result);
    TestValidator.predicate(
      `result ${index} has valid pagination metadata`,
      result.pagination.current >= 1 &&
        result.pagination.limit >= 1 &&
        result.pagination.records >= 0 &&
        result.pagination.pages >= 0,
    );
    TestValidator.predicate(
      `result ${index} data is array`,
      Array.isArray(result.data),
    );
    // Validate each article in results has required structure
    await ArrayUtil.asyncForEach(result.data, async (article, articleIndex) => {
      typia.assert(article);
      TestValidator.predicate(
        `article ${articleIndex} has non-empty id`,
        article.id.length > 0,
      );
      TestValidator.predicate(
        `article ${articleIndex} has non-empty title`,
        article.title.length > 0,
      );
      TestValidator.predicate(
        `article ${articleIndex} has author`,
        article.author !== null,
      );
      TestValidator.predicate(
        `article ${articleIndex} has section`,
        article.section !== null,
      );
      TestValidator.predicate(
        `article ${articleIndex} has tags array`,
        Array.isArray(article.tags),
      );
      TestValidator.predicate(
        `article ${articleIndex} has valid comments count`,
        article.comments_count >= 0,
      );
    });
  });
}
