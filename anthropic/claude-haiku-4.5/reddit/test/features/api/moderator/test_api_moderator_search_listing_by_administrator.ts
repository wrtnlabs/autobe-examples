import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModerator";

/**
 * Search and retrieve paginated list of community moderators with filtering and
 * sorting capabilities.
 *
 * Tests the administrator moderator search endpoint by creating a complete test
 * environment with authenticated users, community setup, and validating
 * moderator roster discovery with advanced filtering options.
 *
 * Process:
 *
 * 1. Create and authenticate as administrator user
 * 2. Create a category for community organization
 * 3. Authenticate as member and create a community
 * 4. Search moderators with various filter and sort criteria
 * 5. Validate pagination, filtering, and sorting functionality
 * 6. Test edge cases (empty results, max page sizes)
 */
export async function test_api_moderator_search_listing_by_administrator(
  connection: api.IConnection,
) {
  // 1. Administrator authentication and setup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: "",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Switch back to administrator context for subsequent calls
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: "",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // 2. Create a category for community classification
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member and authenticate as member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(10),
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: "",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 4. Create community with member as creator
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Switch back to administrator for moderator search
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: "",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // 5. Test moderator search with default pagination
  const moderators =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(moderators);
  TestValidator.predicate(
    "moderators response has pagination",
    moderators.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is 1",
    moderators.pagination.current === 1,
  );
  TestValidator.predicate("limit is 10", moderators.pagination.limit === 10);

  // 6. Test with search query
  const searchResults =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          search: member.id.substring(0, 8),
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(searchResults);
  TestValidator.predicate(
    "search results returned",
    searchResults.data !== undefined,
  );

  // 7. Test with tier filtering
  const tierFilterResults =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          tier: "creator",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(tierFilterResults);
  TestValidator.predicate(
    "tier filter results returned",
    tierFilterResults.data !== undefined,
  );

  // 8. Test sorting by appointedAt ascending
  const sortByAppointedAsc =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          orderBy: "appointedAt",
          order: "asc",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(sortByAppointedAsc);

  // 9. Test sorting by tier
  const sortByTier =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          orderBy: "tier",
          order: "desc",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(sortByTier);

  // 10. Test sorting by username
  const sortByUsername =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          orderBy: "username",
          order: "asc",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(sortByUsername);

  // 11. Test with date range filtering
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateFilterResults =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          appointedAtStart: oneMonthAgo.toISOString(),
          appointedAtEnd: now.toISOString(),
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(dateFilterResults);

  // 12. Test pagination with different page sizes
  const smallPageSize =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(smallPageSize);
  TestValidator.predicate(
    "small page size respected",
    smallPageSize.pagination.limit === 5,
  );

  const maxPageSize =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(maxPageSize);
  TestValidator.predicate(
    "max page size capped at 100",
    maxPageSize.pagination.limit <= 100,
  );

  // 13. Test with includeRemoved flag
  const includeRemovedResults =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          includeRemoved: true,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(includeRemovedResults);

  // 14. Test combined filtering with search and tier
  const combinedFilter =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          search: member.id.substring(0, 5),
          tier: "senior",
          orderBy: "appointedAt",
          order: "desc",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(combinedFilter);

  // 15. Validate data structure of returned moderators
  if (moderators.data.length > 0) {
    const moderator = moderators.data[0];
    typia.assert(moderator);
    TestValidator.predicate(
      "moderator has id",
      moderator.id !== undefined && moderator.id.length > 0,
    );
    TestValidator.predicate(
      "moderator has tier",
      ["creator", "senior", "junior"].includes(moderator.moderator_tier),
    );
    TestValidator.predicate(
      "moderator has appointed_at",
      moderator.appointed_at !== undefined,
    );
    TestValidator.predicate(
      "moderator has is_active",
      typeof moderator.is_active === "boolean",
    );
    TestValidator.predicate(
      "moderator has community info",
      moderator.community !== undefined,
    );
    TestValidator.predicate(
      "moderator has member info",
      moderator.member !== undefined,
    );
  }

  // 16. Test pagination metadata consistency
  TestValidator.predicate(
    "pagination records is consistent",
    typeof moderators.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination pages is calculated correctly",
    moderators.pagination.pages ===
      Math.ceil(moderators.pagination.records / moderators.pagination.limit),
  );
}
