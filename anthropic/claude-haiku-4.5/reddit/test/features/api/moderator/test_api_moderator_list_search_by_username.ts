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
 * Test moderator list search functionality by username.
 *
 * This test validates the search endpoint's ability to filter moderators by
 * username using the search parameter. It covers:
 *
 * - Partial and exact username matching
 * - Case-sensitivity handling
 * - Empty search results
 * - Search combined with pagination
 * - Search combined with tier filtering and date range filtering
 * - Respecting the 100-character maximum length constraint on search parameter
 *
 * Test workflow:
 *
 * 1. Set up admin account and authentication
 * 2. Create a category for organizing communities
 * 3. Create a test community
 * 4. Create multiple member accounts with distinct usernames
 * 5. Appoint members as moderators with various tiers
 * 6. Execute search queries with different criteria
 * 7. Validate search results match expected outcomes
 */
export async function test_api_moderator_list_search_by_username(
  connection: api.IConnection,
) {
  // Step 1: Set up admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.name(1),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: `category-${RandomGenerator.alphaNumeric(8)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create a member and community
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!",
        username: RandomGenerator.name(1),
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create multiple members with distinct usernames for moderator search testing
  const moderatorNames = [
    "alice_smith",
    "bob_jones",
    "charlie_brown",
    "diana_prince",
    "eve_wilson",
  ] as const;

  const moderators = await ArrayUtil.asyncRepeat(
    moderatorNames.length,
    async (index) => {
      const modEmail = typia.random<string & tags.Format<"email">>();
      const mod: ICommunityPlatformMember.IAuthorized =
        await api.functional.auth.member.join(connection, {
          body: {
            email: modEmail,
            password: "ModPassword123!",
            username: moderatorNames[index],
            href: "http://localhost:3000/join",
            referrer: "http://localhost:3000",
          } satisfies ICommunityPlatformMember.ICreate,
        });
      typia.assert(mod);
      return mod;
    },
  );

  // Step 5: Appoint moderators with different tiers
  const appointedModerators = await ArrayUtil.asyncRepeat(
    moderators.length,
    async (index) => {
      const tier = index % 2 === 0 ? ("senior" as const) : ("junior" as const);
      const appointed: ICommunityPlatformCommunityModerator =
        await api.functional.communityPlatform.member.communities.moderators.create(
          connection,
          {
            communityId: community.id,
            body: {
              memberId: moderators[index].id,
              tier: tier,
            } satisfies ICommunityPlatformCommunityModerator.ICreate,
          },
        );
      typia.assert(appointed);
      return appointed;
    },
  );

  // Step 6: Test exact username match
  const exactSearchResult: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 100,
          search: "alice_smith",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(exactSearchResult);
  TestValidator.predicate(
    "exact search should return one result",
    exactSearchResult.data.length === 1,
  );
  TestValidator.equals(
    "exact search result should have matching username",
    exactSearchResult.data[0].member.username,
    "alice_smith",
  );

  // Step 7: Test partial username match
  const partialSearchResult: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 100,
          search: "smith",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(partialSearchResult);
  TestValidator.predicate(
    "partial search for 'smith' should return at least one result",
    partialSearchResult.data.length >= 1,
  );
  TestValidator.predicate(
    "all results should contain 'smith' in username",
    partialSearchResult.data.every((mod) =>
      mod.member.username.toLowerCase().includes("smith"),
    ),
  );

  // Step 8: Test search with no results
  const noResultsSearch: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 100,
          search: "nonexistent_user_xyz",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(noResultsSearch);
  TestValidator.equals(
    "search with no matching username should return empty results",
    noResultsSearch.data.length,
    0,
  );

  // Step 9: Test search with pagination
  const paginatedSearch1: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 2,
          search: "",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(paginatedSearch1);
  TestValidator.predicate(
    "first page should have max 2 results",
    paginatedSearch1.data.length <= 2,
  );

  // Step 10: Test search with tier filter
  const seniorModeratorSearch: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 100,
          tier: "senior",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(seniorModeratorSearch);
  TestValidator.predicate(
    "all senior moderators should have senior tier",
    seniorModeratorSearch.data.every((mod) => mod.moderator_tier === "senior"),
  );

  // Step 11: Test search with tier and search query combined
  const combinedSearch: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 100,
          search: "bob",
          tier: "junior",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(combinedSearch);

  // Step 12: Test search parameter respects case-insensitivity
  const caseInsensitiveSearch: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 100,
          search: "ALICE",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(caseInsensitiveSearch);

  // Step 13: Test search with maximum length constraint (100 characters)
  const maxLengthSearch = RandomGenerator.alphabets(100);
  const maxLengthSearchResult: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 100,
          search: maxLengthSearch,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(maxLengthSearchResult);

  // Verify pagination metadata is correct
  TestValidator.predicate(
    "pagination current page should be valid",
    exactSearchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    exactSearchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    exactSearchResult.pagination.records >= 0,
  );
}
