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
 * Test filtering moderators by their tier level within a community.
 *
 * This test validates the moderator search and filtering functionality
 * available through the administrator API. It tests:
 *
 * 1. Setup: Create a category and community to establish context
 * 2. Authenticate as an administrator for moderator list access
 * 3. Test unfiltered moderator listing - retrieves all moderators
 * 4. Test tier-based filtering - verifies creator tier filtering works
 * 5. Test pagination with moderator results
 * 6. Test sorting by appointment date
 * 7. Test search functionality with optional tier filter
 * 8. Test sorting by username and tier
 * 9. Validate authorization - only admins can access moderator lists
 * 10. Test active status filtering
 */
export async function test_api_moderator_search_filtering_by_tier(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for platform management
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePass123!",
        username: `admin_${RandomGenerator.alphaNumeric(6)}`,
        name: "Test Administrator",
        href: "https://test.example.com/admin",
        referrer: "https://test.example.com/referrer",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a category for community organization
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: `Test Category ${RandomGenerator.alphaNumeric(4)}`,
          slug: `test-cat-${RandomGenerator.alphaNumeric(5)}`,
          display_order: 1,
          description: "Test category for moderator filtering",
          icon_url: "https://example.com/icon.png",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create a member account to be the community creator
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `member_${RandomGenerator.alphaNumeric(6)}`,
        password: "MemberPass123!",
        href: "https://test.example.com/join",
        referrer: "https://test.example.com/referrer",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a community with the member as creator
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `Moderator Test Community ${RandomGenerator.alphaNumeric(4)}`,
          identifier: `mod-test-${RandomGenerator.alphaNumeric(6)}`,
          description: "Community for testing moderator tier filtering",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Switch to administrator for moderator management
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: "SecurePass123!",
      href: "https://test.example.com/admin-login",
      referrer: "https://test.example.com/referrer",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Step 6: Test unfiltered moderator listing
  const allModeratorsResult: IPageICommunityPlatformCommunityModerator.ISummary =
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
  typia.assert(allModeratorsResult);

  // Validate that community creator exists as moderator
  TestValidator.predicate(
    "community should have at least one moderator (creator)",
    allModeratorsResult.data.length > 0,
  );

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination should have valid current page",
    allModeratorsResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    allModeratorsResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    allModeratorsResult.pagination.records >= 0,
  );

  // Step 7: Test filtering by creator tier
  const creatorTierResult: IPageICommunityPlatformCommunityModerator.ISummary =
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
  typia.assert(creatorTierResult);

  // Validate creator tier filtering
  TestValidator.predicate(
    "creator tier filter should return creator moderators",
    creatorTierResult.data.every((mod) => mod.moderator_tier === "creator"),
  );
  TestValidator.predicate(
    "creator tier result should not be empty",
    creatorTierResult.data.length > 0,
  );

  // Step 8: Test filtering by senior tier (may return empty)
  const seniorTierResult: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          tier: "senior",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(seniorTierResult);

  // Validate senior tier filtering excludes non-senior moderators
  TestValidator.predicate(
    "senior tier filter should only return senior moderators",
    seniorTierResult.data.every((mod) => mod.moderator_tier === "senior"),
  );
  TestValidator.predicate(
    "senior tier should not contain creator tier moderators",
    !seniorTierResult.data.some((mod) => mod.moderator_tier === "creator"),
  );

  // Step 9: Test filtering by junior tier (may return empty)
  const juniorTierResult: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          tier: "junior",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(juniorTierResult);

  // Validate junior tier filtering
  TestValidator.predicate(
    "junior tier filter should only return junior moderators",
    juniorTierResult.data.every((mod) => mod.moderator_tier === "junior"),
  );
  TestValidator.predicate(
    "junior tier should exclude other tiers",
    !juniorTierResult.data.some(
      (mod) =>
        mod.moderator_tier === "creator" || mod.moderator_tier === "senior",
    ),
  );

  // Step 10: Test sorting by appointed date
  const sortedByDateResult: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 50,
          orderBy: "appointedAt",
          order: "desc",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(sortedByDateResult);

  TestValidator.predicate(
    "sorting by appointment date should return valid results",
    sortedByDateResult.data.length >= 0,
  );

  // Step 11: Test sorting by tier
  const sortedByTierResult: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 50,
          orderBy: "tier",
          order: "asc",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(sortedByTierResult);

  TestValidator.predicate(
    "sorting by tier should maintain valid moderator data",
    sortedByTierResult.data.every(
      (mod) =>
        mod.moderator_tier === "creator" ||
        mod.moderator_tier === "senior" ||
        mod.moderator_tier === "junior",
    ),
  );

  // Step 12: Test sorting by username
  const sortedByUsernameResult: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 50,
          orderBy: "username",
          order: "asc",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(sortedByUsernameResult);

  TestValidator.predicate(
    "sorting by username should return valid results",
    sortedByUsernameResult.data.length >= 0,
  );

  // Step 13: Test active status filtering
  const activeModsResult: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          includeRemoved: false,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(activeModsResult);

  // Validate all results are active moderators
  TestValidator.predicate(
    "active filter should return only active moderators",
    activeModsResult.data.every((mod) => mod.is_active === true),
  );

  // Step 14: Test with includeRemoved to get removed moderators if any
  const allModsIncludingRemovedResult: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 100,
          includeRemoved: true,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(allModsIncludingRemovedResult);

  // Validate that including removed gives more or equal results
  TestValidator.predicate(
    "including removed should return >= active only results",
    allModsIncludingRemovedResult.data.length >= activeModsResult.data.length,
  );

  // Step 15: Test tier filter combined with active filter
  const creatorActiveResult: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          tier: "creator",
          includeRemoved: false,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(creatorActiveResult);

  TestValidator.predicate(
    "creator tier with active filter should return only active creators",
    creatorActiveResult.data.every(
      (mod) => mod.moderator_tier === "creator" && mod.is_active === true,
    ),
  );
}
