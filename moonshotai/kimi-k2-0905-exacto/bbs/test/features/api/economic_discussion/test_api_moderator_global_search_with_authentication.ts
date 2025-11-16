import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";
import type { IEconomicDiscussionSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSearch";
import type { IEconomicDiscussionSearchFilters } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSearchFilters";
import type { IEconomicDiscussionSearchMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSearchMetadata";
import type { IEconomicDiscussionSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSearchQuery";
import type { IPageIEconomicDiscussionSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionSearchQuery";

/**
 * Test that moderators can perform comprehensive global searches across all
 * economic discussion content including articles, categories, and metadata.
 * Validates that authenticated moderators receive comprehensive search results
 * with proper pagination, relevance ranking, and access to all content types
 * regardless of moderation status. Includes testing of search query validation,
 * result metadata verification, and pagination functionality to ensure
 * moderators can efficiently discover and manage content across the platform.
 */
export async function test_api_moderator_global_search_with_authentication(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account to establish authentication context
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IEconomicDiscussionModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.name(),
        email: moderatorEmail,
        password_hash: RandomGenerator.alphaNumeric(32),
        email_verified: true,
        two_factor_enabled: true,
        moderation_level: "standard",
      } satisfies IEconomicDiscussionModerator.ICreate,
    });
  typia.assert(moderator);

  TestValidator.equals(
    "moderator authenticated",
    !!moderator.token.access,
    true,
  );

  // Step 2: Perform global search with basic query
  const searchQuery = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const searchResult =
    await api.functional.economicDiscussion.moderator.search.global.search(
      connection,
      {
        body: {
          query: searchQuery,
          scope: "moderator",
          sort_by: "relevance",
          order: "desc",
          page: 1,
          limit: 10,
        } satisfies IEconomicDiscussionSearch.IRequest,
      },
    );

  typia.assert(searchResult);
  TestValidator.predicate(
    "search result returns data array",
    Array.isArray(searchResult.data),
  );
  TestValidator.predicate(
    "pagination metadata valid",
    searchResult.pagination.current >= 0 &&
      searchResult.pagination.pages >= searchResult.pagination.current &&
      searchResult.pagination.limit >= 1 &&
      searchResult.pagination.limit <= 100,
  );

  // Step 3: Validate search results include articles with proper metadata
  if (searchResult.data.length > 0) {
    const firstResult = searchResult.data[0];
    TestValidator.predicate(
      "result has articles array",
      Array.isArray(firstResult.articles),
    );
    TestValidator.predicate(
      "total count non-negative",
      firstResult.total_count >= 0,
    );
    TestValidator.predicate(
      "search metadata present",
      firstResult.search_metadata !== undefined,
    );
    TestValidator.predicate(
      "result has valid search metadata",
      firstResult.search_metadata.query !== undefined &&
        firstResult.search_metadata.sort_order !== undefined &&
        firstResult.search_metadata.scope !== undefined,
    );

    // Verify articles have proper metadata
    if (firstResult.articles.length > 0) {
      const firstArticle = firstResult.articles[0];
      TestValidator.predicate(
        "article has valid UUID id",
        firstArticle.id !== undefined && firstArticle.id.length > 0,
      );
      TestValidator.predicate(
        "article has non-empty title",
        firstArticle.title !== undefined && firstArticle.title.length > 0,
      );
      TestValidator.predicate(
        "article has view count",
        firstArticle.view_count >= 0,
      );
      TestValidator.predicate(
        "article has creation date",
        firstArticle.created_at !== undefined &&
          firstArticle.created_at.length > 10,
      );
      TestValidator.predicate(
        "article has categories array",
        Array.isArray(firstArticle.categories),
      );
    }
  }

  // Step 4: Test search with filters (categories, sorting)
  const sortTypes = ["relevance", "created_at", "updated_at"] as const; // Remove view_count if not in valid options
  for (const sortBy of sortTypes) {
    const sortedResult =
      await api.functional.economicDiscussion.moderator.search.global.search(
        connection,
        {
          body: {
            query: searchQuery,
            scope: "moderator",
            sort_by: sortBy,
            order: "asc",
            page: 1,
            limit: 5,
          } satisfies IEconomicDiscussionSearch.IRequest,
        },
      );

    typia.assert(sortedResult);
    TestValidator.predicate(
      `sort by ${sortBy} returns valid structure`,
      sortedResult.data !== undefined && Array.isArray(sortedResult.data),
    );

    // Validate specific sort order properties
    if (sortedResult.data.length > 0 && sortBy !== "relevance") {
      TestValidator.predicate(
        `result count matches pagination when sorting by ${sortBy}`,
        sortedResult.data.length <= sortedResult.pagination.limit,
      );
    }
  }

  // Step 5: Verify pagination functionality
  const paginatedSearchPromises = ArrayUtil.repeat(3, () => {
    const randomPage = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >();
    return api.functional.economicDiscussion.moderator.search.global.search(
      connection,
      {
        body: {
          query: searchQuery,
          scope: "moderator",
          sort_by: "relevance",
          order: "desc",
          page: randomPage,
          limit: 5,
        } satisfies IEconomicDiscussionSearch.IRequest,
      },
    );
  });

  const paginatedResults = await Promise.all(paginatedSearchPromises);

  for (let i = 0; i < paginatedResults.length; i++) {
    const result = paginatedResults[i];
    typia.assert(result);
    TestValidator.predicate(
      `paginated result ${i} has valid pagination bounds`,
      result.pagination.current >= 0 &&
        result.pagination.current <= result.pagination.pages,
    );
    TestValidator.predicate(
      `paginated result ${i} has data array`,
      Array.isArray(result.data),
    );
    TestValidator.predicate(
      `paginated result ${i} honors limit`,
      result.data.length <= result.pagination.limit,
    );
  }

  // Step 6: Test search query validation with edge cases
  const edgeCaseQueries = [
    RandomGenerator.paragraph({ sentences: 1, wordMin: 1, wordMax: 5 }),
    RandomGenerator.paragraph({ sentences: 10, wordMin: 8, wordMax: 15 }),
    RandomGenerator.alphaNumeric(1),
    RandomGenerator.name(15),
  ];

  for (const edgeQuery of edgeCaseQueries) {
    const edgeCaseResult =
      await api.functional.economicDiscussion.moderator.search.global.search(
        connection,
        {
          body: {
            query: edgeQuery,
            scope: "moderator",
            sort_by: "relevance",
            order: "desc",
          } satisfies IEconomicDiscussionSearch.IRequest,
        },
      );

    typia.assert(edgeCaseResult);
    TestValidator.predicate(
      `edge case query "${edgeQuery.slice(0, 20)}..." returns valid structure`,
      edgeCaseResult.data !== undefined && Array.isArray(edgeCaseResult.data),
    );

    // Verify metadata is properly populated
    TestValidator.predicate(
      `edge case metadata contains query`,
      edgeCaseResult.data.length > 0
        ? edgeCaseResult.data[0].search_metadata.query !== undefined
        : true,
    );
  }
}
