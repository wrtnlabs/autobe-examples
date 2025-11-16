import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchResult";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSearchResult";

/**
 * Test that the search endpoint is publicly accessible without authentication.
 *
 * Verifies that guest users can perform searches across the discussion board
 * without providing authentication credentials. The test validates that public
 * search results return only published articles and exclude
 * draft/pending/rejected articles. It ensures public search results include
 * article summaries with titles, bodies, creators, and categories while
 * respecting visibility rules. The test confirms that guest access to search
 * does not provide administrative capabilities.
 *
 * Test workflow:
 *
 * 1. Create an unauthenticated connection (empty headers)
 * 2. Perform basic keyword search without authentication
 * 3. Validate search results contain only published articles
 * 4. Test search with category filtering
 * 5. Test search with pagination
 * 6. Verify result structure includes required fields
 * 7. Validate that no draft/pending articles are visible
 * 8. Verify visibility rules prevent non-published article access
 */
export async function test_api_search_public_access_no_auth(
  connection: api.IConnection,
) {
  // Create an unauthenticated connection for public access testing
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Test 1: Basic keyword search without authentication
  const searchQuery = RandomGenerator.paragraph({ sentences: 2 });
  const basicSearchResult: IPageIDiscussionBoardSearchResult =
    await api.functional.discussionBoard.search.index(unauthConn, {
      body: {
        q: searchQuery,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(basicSearchResult);

  // Validate search response structure
  TestValidator.predicate(
    "search result has pagination",
    basicSearchResult.pagination !== null &&
      basicSearchResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "search result has data array",
    Array.isArray(basicSearchResult.data),
  );

  // Test 2: Validate that only published articles are in results
  for (const result of basicSearchResult.data) {
    typia.assert(result);

    // Check that articles in results are published
    for (const article of result.articles) {
      TestValidator.equals(
        "article status should be published",
        article.status,
        "published",
      );

      // Verify article has required fields
      TestValidator.predicate(
        "article has id",
        article.id !== null && article.id !== undefined,
      );
      TestValidator.predicate(
        "article has title",
        article.title !== null &&
          article.title !== undefined &&
          article.title.length > 0,
      );
      TestValidator.predicate(
        "article has creator",
        article.creator !== null && article.creator !== undefined,
      );
      TestValidator.predicate(
        "article has category",
        article.category !== null && article.category !== undefined,
      );
    }
  }

  // Test 3: Search with category filtering
  const categoryFilter = [typia.random<string & tags.Format<"uuid">>()];
  const categorySearchResult: IPageIDiscussionBoardSearchResult =
    await api.functional.discussionBoard.search.index(unauthConn, {
      body: {
        q: searchQuery,
        categories: categoryFilter,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(categorySearchResult);
  TestValidator.predicate(
    "category filtered search returns results",
    categorySearchResult.data !== null &&
      categorySearchResult.data !== undefined,
  );

  // Test 4: Search with pagination
  const paginatedSearchResult: IPageIDiscussionBoardSearchResult =
    await api.functional.discussionBoard.search.index(unauthConn, {
      body: {
        q: searchQuery,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(paginatedSearchResult);

  TestValidator.predicate(
    "pagination has current page",
    paginatedSearchResult.pagination.current !== null &&
      paginatedSearchResult.pagination.current !== undefined,
  );
  TestValidator.predicate(
    "pagination has limit",
    paginatedSearchResult.pagination.limit !== null &&
      paginatedSearchResult.pagination.limit !== undefined,
  );
  TestValidator.predicate(
    "pagination has total records",
    paginatedSearchResult.pagination.records !== null &&
      paginatedSearchResult.pagination.records !== undefined,
  );

  // Test 5: Verify search result content structure
  if (paginatedSearchResult.data.length > 0) {
    const firstResult = paginatedSearchResult.data[0];
    typia.assert(firstResult);

    TestValidator.predicate(
      "result has articles array",
      Array.isArray(firstResult.articles),
    );
    TestValidator.predicate(
      "result has comments array",
      Array.isArray(firstResult.comments),
    );
    TestValidator.predicate(
      "result has total_results count",
      typeof firstResult.total_results === "number",
    );
    TestValidator.predicate(
      "result has result_types breakdown",
      firstResult.result_types !== null &&
        firstResult.result_types !== undefined,
    );

    // Validate creator information in articles
    for (const article of firstResult.articles) {
      TestValidator.predicate(
        "article creator has id",
        article.creator.id !== null && article.creator.id !== undefined,
      );
      TestValidator.predicate(
        "article creator has display_name",
        article.creator.display_name !== null &&
          article.creator.display_name !== undefined &&
          article.creator.display_name.length > 0,
      );
      TestValidator.predicate(
        "article creator has account_status",
        article.creator.account_status !== null &&
          article.creator.account_status !== undefined,
      );
    }
  }

  // Test 6: Search with status filter shows visibility rule enforcement
  const statusFilterResult: IPageIDiscussionBoardSearchResult =
    await api.functional.discussionBoard.search.index(unauthConn, {
      body: {
        q: searchQuery,
        status: ["published"],
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(statusFilterResult);

  // Verify all returned articles are published
  for (const result of statusFilterResult.data) {
    for (const article of result.articles) {
      TestValidator.equals(
        "filtered article must be published",
        article.status,
        "published",
      );
    }
  }

  // Test 7: Test with empty search results
  const uniqueQuery = RandomGenerator.alphaNumeric(16);
  const emptySearchResult: IPageIDiscussionBoardSearchResult =
    await api.functional.discussionBoard.search.index(unauthConn, {
      body: {
        q: uniqueQuery,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(emptySearchResult);
  TestValidator.predicate(
    "empty search returns valid structure",
    emptySearchResult.pagination !== null && emptySearchResult.data !== null,
  );

  // Test 8: Verify visibility rules prevent draft article access
  // Even if guest tries to request multiple statuses, only published are returned
  const visibilityTestResult: IPageIDiscussionBoardSearchResult =
    await api.functional.discussionBoard.search.index(unauthConn, {
      body: {
        q: searchQuery,
        status: ["pending_approval", "published", "rejected"],
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(visibilityTestResult);

  // Verify that even with multiple status filters, guest only sees published
  for (const result of visibilityTestResult.data) {
    for (const article of result.articles) {
      TestValidator.equals(
        "visibility rules enforce published-only for guests",
        article.status,
        "published",
      );
    }
  }
}
