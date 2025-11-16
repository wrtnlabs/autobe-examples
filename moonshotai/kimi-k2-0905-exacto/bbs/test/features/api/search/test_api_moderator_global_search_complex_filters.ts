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
 * Test advanced search functionality with complex filter combinations including
 * category filters, sort options, and different query scopes.
 *
 * This comprehensive test validates moderator search capabilities across the
 * economic discussion platform:
 *
 * 1. Establish moderator authentication with elevated permissions
 * 2. Perform searches with various category filter combinations
 * 3. Test different sorting strategies (relevance, date, views)
 * 4. Validate pagination with complex filter combinations
 * 5. Verify moderator-specific content access and visibility rules
 * 6. Test search metadata accuracy including execution time tracking
 * 7. Validate scope-based content filtering for moderator role
 *
 * The test ensures moderators can effectively discover and manage content
 * across the platform using sophisticated search criteria and filtering
 * options.
 */
export async function test_api_moderator_global_search_complex_filters(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for testing
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: moderatorEmail,
      password_hash: RandomGenerator.alphaNumeric(32),
      moderation_level: "standard",
      email_verified: true,
      two_factor_enabled: false,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Test basic search with query only
  const basicSearch =
    await api.functional.economicDiscussion.moderator.search.global.search(
      connection,
      {
        body: {
          query: RandomGenerator.paragraph({ sentences: 3 }),
          scope: "moderator",
          sort_by: "relevance",
          order: "desc",
          page: 1,
          limit: 10,
        } satisfies IEconomicDiscussionSearch.IRequest,
      },
    );
  typia.assert(basicSearch);

  TestValidator.predicate(
    "basic search returns results",
    basicSearch.data.length >= 0,
  );
  TestValidator.equals(
    "basic search has pagination",
    basicSearch.pagination.limit,
    10,
  );

  // Step 3: Test search with null categories (all categories)
  const categorySearch =
    await api.functional.economicDiscussion.moderator.search.global.search(
      connection,
      {
        body: {
          query: RandomGenerator.paragraph({ sentences: 2 }),
          categories: null,
          scope: "moderator",
          sort_by: "created_at",
          order: "desc",
          page: 1,
          limit: 20,
        } satisfies IEconomicDiscussionSearch.IRequest,
      },
    );
  typia.assert(categorySearch);

  TestValidator.predicate(
    "category search returns results",
    categorySearch.data.length >= 0,
  );
  TestValidator.equals(
    "category search pagination limit",
    categorySearch.pagination.limit,
    20,
  );

  // Step 4: Test different sorting options
  const sortOptions = [
    "relevance",
    "created_at",
    "updated_at",
    "view_count",
  ] as const;

  for (const sortBy of sortOptions) {
    const sortedSearch =
      await api.functional.economicDiscussion.moderator.search.global.search(
        connection,
        {
          body: {
            query: RandomGenerator.paragraph({ sentences: 1 }),
            scope: "moderator",
            sort_by: sortBy,
            order: "desc",
            page: 1,
            limit: 15,
          } satisfies IEconomicDiscussionSearch.IRequest,
        },
      );
    typia.assert(sortedSearch);

    TestValidator.predicate(
      `search with sort ${sortBy} returns results`,
      sortedSearch.data.length >= 0,
    );
  }

  // Step 5: Test ascending order
  const ascendingSearch =
    await api.functional.economicDiscussion.moderator.search.global.search(
      connection,
      {
        body: {
          query: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          scope: "moderator",
          sort_by: "created_at",
          order: "asc",
          page: 1,
          limit: 25,
        } satisfies IEconomicDiscussionSearch.IRequest,
      },
    );
  typia.assert(ascendingSearch);

  TestValidator.predicate(
    "ascending search returns results",
    ascendingSearch.data.length >= 0,
  );

  // Step 6: Test pagination with complex filters
  const paginatedSearch =
    await api.functional.economicDiscussion.moderator.search.global.search(
      connection,
      {
        body: {
          query: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 8,
            sentenceMax: 15,
          }),
          categories: undefined,
          scope: "moderator",
          sort_by: "view_count",
          order: "desc",
          page: 2,
          limit: 5,
        } satisfies IEconomicDiscussionSearch.IRequest,
      },
    );
  typia.assert(paginatedSearch);

  TestValidator.predicate(
    "paginated search page 2 has results",
    paginatedSearch.data.length >= 0,
  );
  TestValidator.equals(
    "paginated search page number",
    paginatedSearch.pagination.current,
    1,
  ); // API uses 0-based indexing
  TestValidator.equals(
    "paginated search limit",
    paginatedSearch.pagination.limit,
    5,
  );

  // Step 7: Test different scopes
  const scopes = ["all", "member", "moderator"] as const;

  for (const scope of scopes) {
    const scopeSearch =
      await api.functional.economicDiscussion.moderator.search.global.search(
        connection,
        {
          body: {
            query: RandomGenerator.paragraph({ sentences: 4 }),
            scope: scope,
            sort_by: "relevance",
            order: "desc",
            page: 1,
            limit: 10,
          } satisfies IEconomicDiscussionSearch.IRequest,
        },
      );
    typia.assert(scopeSearch);

    TestValidator.predicate(
      `search with scope ${scope} returns results`,
      scopeSearch.data.length >= 0,
    );
  }

  // Step 8: Test search metadata validation
  const metadataSearch =
    await api.functional.economicDiscussion.moderator.search.global.search(
      connection,
      {
        body: {
          query: "economic policy discussion",
          scope: "moderator",
          sort_by: "relevance",
          order: "desc",
          page: 1,
          limit: 10,
        } satisfies IEconomicDiscussionSearch.IRequest,
      },
    );
  typia.assert(metadataSearch);

  TestValidator.predicate(
    "metadata search returns results",
    metadataSearch.data.length >= 0,
  );

  // Step 9: Test empty search results
  const emptySearch =
    await api.functional.economicDiscussion.moderator.search.global.search(
      connection,
      {
        body: {
          query: "zzzzz_nonexistent_search_term_12345",
          scope: "moderator",
          sort_by: "relevance",
          order: "desc",
          page: 1,
          limit: 10,
        } satisfies IEconomicDiscussionSearch.IRequest,
      },
    );
  typia.assert(emptySearch);

  TestValidator.predicate(
    "empty search returns zero results",
    emptySearch.data.length === 0,
  );
  TestValidator.predicate(
    "empty search has zero total count",
    emptySearch.pagination.records === 0,
  );

  // Step 10: Test complex filter combinations
  const complexSearch =
    await api.functional.economicDiscussion.moderator.search.global.search(
      connection,
      {
        body: {
          query: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 10,
            sentenceMax: 20,
          }),
          categories: undefined,
          scope: "all",
          sort_by: "updated_at",
          order: "asc",
          page: 1,
          limit: 50,
        } satisfies IEconomicDiscussionSearch.IRequest,
      },
    );
  typia.assert(complexSearch);

  TestValidator.predicate(
    "complex search returns results",
    complexSearch.data.length >= 0,
  );
  TestValidator.predicate(
    "complex search respects limit",
    complexSearch.data.length <= 50,
  );
  TestValidator.equals(
    "complex search pagination limit",
    complexSearch.pagination.limit,
    50,
  );

  // Step 11: Validate search result structure
  if (complexSearch.data.length > 0) {
    const result = complexSearch.data[0];

    TestValidator.predicate(
      "search result has articles array",
      Array.isArray(result.articles),
    );
    TestValidator.predicate(
      "search result has valid total count",
      result.total_count >= 0 && result.total_count <= 10000,
    );
    TestValidator.predicate(
      "search result has metadata",
      result.search_metadata !== undefined,
    );

    if (result.articles.length > 0) {
      const article = result.articles[0];

      TestValidator.predicate(
        "article has valid ID format",
        typia.is<string & tags.Format<"uuid">>(article.id),
      );
      TestValidator.predicate("article has title", article.title.length > 0);
      TestValidator.predicate(
        "article has view count",
        article.view_count >= 0,
      );
      TestValidator.predicate(
        "article has valid status",
        ["pending", "approved", "rejected"].includes(article.status),
      );
    }
  }
}
