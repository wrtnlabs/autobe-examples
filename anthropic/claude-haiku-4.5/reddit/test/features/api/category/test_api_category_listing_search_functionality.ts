import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCategory";

export async function test_api_category_listing_search_functionality(
  connection: api.IConnection,
) {
  // Create an administrator account
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Create categories
  const technologyCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          description: "Technology and computing topics",
          icon_url: null,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(technologyCategory);

  const techNewsCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology News",
          slug: "tech-news",
          description: "Latest technology news and updates",
          icon_url: null,
          display_order: 2,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(techNewsCategory);

  const entertainmentCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Entertainment",
          slug: "entertainment",
          description: "Entertainment and media",
          icon_url: null,
          display_order: 3,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(entertainmentCategory);

  const sportsCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Sports",
          slug: "sports",
          description: "Sports and athletic activities",
          icon_url: null,
          display_order: 4,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(sportsCategory);

  const techSupportCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Tech Support",
          slug: "tech-support",
          description: "Technical support and troubleshooting",
          icon_url: null,
          display_order: 5,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(techSupportCategory);

  // Test: Search for 'technology' keyword
  const technologyResults: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 100,
        search: "technology",
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(technologyResults);
  TestValidator.predicate(
    "technology search returns results",
    technologyResults.data.length > 0,
  );
  TestValidator.predicate(
    "technology search includes Technology category",
    technologyResults.data.some((c) => c.name === "Technology"),
  );
  TestValidator.predicate(
    "technology search includes Technology News category",
    technologyResults.data.some((c) => c.name === "Technology News"),
  );

  // Test: Search for 'tech' keyword (partial match)
  const techResults: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 100,
        search: "tech",
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(techResults);
  TestValidator.predicate(
    "tech search includes Technology category",
    techResults.data.some((c) => c.name === "Technology"),
  );
  TestValidator.predicate(
    "tech search includes Technology News category",
    techResults.data.some((c) => c.name === "Technology News"),
  );
  TestValidator.predicate(
    "tech search includes Tech Support category",
    techResults.data.some((c) => c.name === "Tech Support"),
  );

  // Test: Search for 'news' keyword
  const newsResults: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 100,
        search: "news",
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(newsResults);
  TestValidator.equals(
    "news search returns only Technology News",
    newsResults.data.length,
    1,
  );
  TestValidator.equals(
    "news search result is Technology News",
    newsResults.data[0].name,
    "Technology News",
  );

  // Test: Search for 'sport' keyword
  const sportResults: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 100,
        search: "sport",
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(sportResults);
  TestValidator.predicate(
    "sport search includes Sports category",
    sportResults.data.some((c) => c.name === "Sports"),
  );

  // Test: Search for non-matching keyword 'nonexistent'
  const nonexistentResults: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 100,
        search: "nonexistent",
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(nonexistentResults);
  TestValidator.equals(
    "nonexistent search returns empty results",
    nonexistentResults.data.length,
    0,
  );

  // Test: Case-insensitive search (search for 'TECHNOLOGY')
  const uppercaseResults: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 100,
        search: "TECHNOLOGY",
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(uppercaseResults);
  TestValidator.predicate(
    "uppercase search is case-insensitive",
    uppercaseResults.data.some((c) => c.name === "Technology"),
  );

  // Test: Slug matching (search 'tech-news')
  const slugResults: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 100,
        search: "tech-news",
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(slugResults);
  TestValidator.predicate(
    "slug search matches by slug",
    slugResults.data.some((c) => c.slug === "tech-news"),
  );

  // Test: Empty search string behavior
  const emptySearchResults: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 100,
        search: "",
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(emptySearchResults);
  TestValidator.predicate(
    "empty search returns all categories",
    emptySearchResults.data.length >= 5,
  );

  // Test: Single character search
  const singleCharResults: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 100,
        search: "t",
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(singleCharResults);
  TestValidator.predicate(
    "single character search returns results",
    singleCharResults.data.length > 0,
  );

  // Test: Search with pagination
  const paginatedResults: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 2,
        search: "tech",
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(paginatedResults);
  TestValidator.predicate(
    "pagination with search returns limited results",
    paginatedResults.data.length <= 2,
  );
  TestValidator.equals(
    "pagination info is valid",
    paginatedResults.pagination.current,
    1,
  );

  // Test: Search with sorting
  const sortedResults: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 100,
        search: "tech",
        sort_by: "name",
        order: "asc",
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(sortedResults);
  TestValidator.predicate(
    "search with sorting returns results",
    sortedResults.data.length > 0,
  );
}
