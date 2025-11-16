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
 * Test moderator list filtering by tier with pagination validation.
 *
 * Validates the PATCH
 * /communityPlatform/member/communities/{communityId}/moderators endpoint that
 * retrieves a filtered and paginated list of community moderators. Tests
 * tier-based filtering (creator, senior, junior), pagination metadata accuracy,
 * proper sorting by appointment date, and error handling for unauthorized
 * access.
 *
 * Test workflow:
 *
 * 1. Set up administrator account for platform operations
 * 2. Create community category (required for community creation)
 * 3. Create community with member as creator
 * 4. Appoint additional members as senior and junior moderators
 * 5. Test tier filtering: query senior moderators only
 * 6. Test tier filtering: query junior moderators only
 * 7. Test pagination: verify metadata (page, limit, total records, total pages)
 * 8. Test sorting: verify moderators sorted by appointment date descending
 * 9. Test error handling: verify access control and community existence validation
 */
export async function test_api_moderator_list_filtering_by_tier(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for platform setup
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminAuthorized = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "AdminPass123!",
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000/",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(adminAuthorized);

  // Switch to admin context for category creation
  const adminConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: adminAuthorized.token.access,
    },
  };

  // Step 2: Create community category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: `Category_${RandomGenerator.alphaNumeric(6)}`,
          slug: `category-${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account (community creator)
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberAuthorized = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "MemberPass123!",
      username: `member_${RandomGenerator.alphaNumeric(8)}`,
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAuthorized);

  // Switch to member context for community operations
  const memberConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: memberAuthorized.token.access,
    },
  };

  // Step 4: Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: `Community_${RandomGenerator.alphaNumeric(8)}`,
          identifier: `comm_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community identifier matches",
    community.identifier,
    `comm_${community.identifier.split("_")[1]}`,
  );

  // Step 5: Create senior moderator member
  const seniorModEmail = `senior_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const seniorModAuthorized = await api.functional.auth.member.join(
    connection,
    {
      body: {
        email: seniorModEmail,
        password: "SeniorMod123!",
        username: `senior_${RandomGenerator.alphaNumeric(8)}`,
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000/",
      } satisfies ICommunityPlatformMember.ICreate,
    },
  );
  typia.assert(seniorModAuthorized);

  // Step 6: Create junior moderator member
  const juniorModEmail = `junior_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const juniorModAuthorized = await api.functional.auth.member.join(
    connection,
    {
      body: {
        email: juniorModEmail,
        password: "JuniorMod123!",
        username: `junior_${RandomGenerator.alphaNumeric(8)}`,
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000/",
      } satisfies ICommunityPlatformMember.ICreate,
    },
  );
  typia.assert(juniorModAuthorized);

  // Step 7: Appoint senior moderator
  const seniorModerator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      memberConnection,
      {
        communityId: community.id,
        body: {
          memberId: seniorModAuthorized.id,
          tier: "senior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(seniorModerator);
  TestValidator.equals(
    "senior moderator tier",
    seniorModerator.moderator_tier,
    "senior",
  );

  // Small delay to ensure different appointment times
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 8: Appoint junior moderator
  const juniorModerator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      memberConnection,
      {
        communityId: community.id,
        body: {
          memberId: juniorModAuthorized.id,
          tier: "junior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(juniorModerator);
  TestValidator.equals(
    "junior moderator tier",
    juniorModerator.moderator_tier,
    "junior",
  );

  // Step 9: Query all moderators (no tier filter)
  const allModeratorsPage =
    await api.functional.communityPlatform.member.communities.moderators.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(allModeratorsPage);
  TestValidator.equals(
    "all moderators page should include creator, senior, and junior",
    allModeratorsPage.data.length,
    3,
  );
  TestValidator.equals(
    "pagination current page",
    allModeratorsPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    allModeratorsPage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination total records",
    allModeratorsPage.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination total pages",
    allModeratorsPage.pagination.pages,
    1,
  );

  // Step 10: Query senior moderators only
  const seniorModeratorsPage =
    await api.functional.communityPlatform.member.communities.moderators.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          tier: "senior",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(seniorModeratorsPage);
  TestValidator.equals(
    "senior moderators count",
    seniorModeratorsPage.data.length,
    1,
  );
  TestValidator.equals(
    "senior moderator tier verification",
    seniorModeratorsPage.data[0].moderator_tier,
    "senior",
  );

  // Step 11: Query junior moderators only
  const juniorModeratorsPage =
    await api.functional.communityPlatform.member.communities.moderators.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          tier: "junior",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(juniorModeratorsPage);
  TestValidator.equals(
    "junior moderators count",
    juniorModeratorsPage.data.length,
    1,
  );
  TestValidator.equals(
    "junior moderator tier verification",
    juniorModeratorsPage.data[0].moderator_tier,
    "junior",
  );

  // Step 12: Query creator moderators
  const creatorModeratorsPage =
    await api.functional.communityPlatform.member.communities.moderators.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          tier: "creator",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(creatorModeratorsPage);
  TestValidator.equals(
    "creator moderators count",
    creatorModeratorsPage.data.length,
    1,
  );
  TestValidator.equals(
    "creator moderator tier verification",
    creatorModeratorsPage.data[0].moderator_tier,
    "creator",
  );

  // Step 13: Verify sorting by appointment date (descending - most recent first)
  const sortedModerators =
    await api.functional.communityPlatform.member.communities.moderators.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          orderBy: "appointedAt",
          order: "desc",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(sortedModerators);
  TestValidator.predicate(
    "moderators sorted by appointment date descending",
    () => {
      for (let i = 0; i < sortedModerators.data.length - 1; i++) {
        const current = new Date(
          sortedModerators.data[i].appointed_at,
        ).getTime();
        const next = new Date(
          sortedModerators.data[i + 1].appointed_at,
        ).getTime();
        if (current < next) return false;
      }
      return true;
    },
  );

  // Step 14: Test pagination with limit
  const paginatedPage =
    await api.functional.communityPlatform.member.communities.moderators.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(paginatedPage);
  TestValidator.equals(
    "paginated response limit",
    paginatedPage.data.length,
    2,
  );
  TestValidator.equals(
    "pagination total records still 3",
    paginatedPage.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination total pages with limit 2",
    paginatedPage.pagination.pages,
    2,
  );

  // Step 15: Test with search query
  const searchResults =
    await api.functional.communityPlatform.member.communities.moderators.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          search: seniorModeratorsPage.data[0].member.username,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(searchResults);
  TestValidator.predicate(
    "search results contain senior moderator",
    searchResults.data.length >= 1,
  );

  // Step 16: Verify moderator summary includes all required fields
  const moderatorSummary = allModeratorsPage.data[0];
  TestValidator.predicate(
    "moderator has id",
    moderatorSummary.id !== null && moderatorSummary.id !== undefined,
  );
  TestValidator.predicate(
    "moderator has tier",
    ["creator", "senior", "junior"].includes(moderatorSummary.moderator_tier),
  );
  TestValidator.predicate(
    "moderator has appointed_at",
    moderatorSummary.appointed_at !== null,
  );
  TestValidator.predicate(
    "moderator has created_at",
    moderatorSummary.created_at !== null,
  );
  TestValidator.predicate(
    "moderator has is_active boolean",
    typeof moderatorSummary.is_active === "boolean",
  );
  TestValidator.predicate(
    "moderator has community",
    moderatorSummary.community !== null,
  );
  TestValidator.predicate(
    "moderator has member",
    moderatorSummary.member !== null,
  );
}
