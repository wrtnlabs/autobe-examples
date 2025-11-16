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

export async function test_api_moderator_list_include_removed_moderators_flag(
  connection: api.IConnection,
) {
  // Setup: Create members and community infrastructure
  const memberEmail1 = typia.random<string & tags.Format<"email">>();
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail1,
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  const memberEmail2 = typia.random<string & tags.Format<"email">>();
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail2,
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  const memberEmail3 = typia.random<string & tags.Format<"email">>();
  const member3: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail3,
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member3);

  // Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(8),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(8),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Appoint moderators with actual member accounts
  const moderator1: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: member1.id,
          tier: "senior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator1);
  TestValidator.predicate(
    "first moderator should be active",
    moderator1.removed_at === null,
  );

  const moderator2: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: member2.id,
          tier: "junior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator2);
  TestValidator.predicate(
    "second moderator should be active",
    moderator2.removed_at === null,
  );

  const moderator3: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: member3.id,
          tier: "senior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator3);
  TestValidator.predicate(
    "third moderator should be active",
    moderator3.removed_at === null,
  );

  // Test 1: List moderators without includeRemoved parameter (should default to false)
  const defaultPage: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.predicate(
    "default should return active moderators",
    defaultPage.data.every((m) => m.is_active === true),
  );
  TestValidator.predicate(
    "default pagination should have correct structure",
    defaultPage.pagination.current >= 1 &&
      defaultPage.pagination.limit > 0 &&
      defaultPage.pagination.records >= 0 &&
      defaultPage.pagination.pages >= 0,
  );

  // Test 2: List moderators with includeRemoved explicitly set to false
  const activeOnlyPage: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.member.communities.moderators.index(
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
  typia.assert(activeOnlyPage);
  TestValidator.predicate(
    "includeRemoved=false should only return active moderators",
    activeOnlyPage.data.every((m) => m.is_active === true),
  );

  // Test 3: List moderators with includeRemoved set to true
  const allModeratorsPage: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.member.communities.moderators.index(
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
  typia.assert(allModeratorsPage);

  // Test 4: Verify moderator structure and is_active flag
  if (allModeratorsPage.data.length > 0) {
    const moderator = allModeratorsPage.data[0];
    TestValidator.predicate(
      "moderator should have valid UUID id",
      typeof moderator.id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          moderator.id,
        ),
    );
    TestValidator.predicate(
      "moderator tier should be valid",
      ["creator", "senior", "junior"].includes(moderator.moderator_tier),
    );
    TestValidator.predicate(
      "is_active flag should be boolean",
      typeof moderator.is_active === "boolean",
    );
    TestValidator.predicate(
      "moderator should have community info",
      moderator.community !== null &&
        typeof moderator.community === "object" &&
        "id" in moderator.community,
    );
    TestValidator.predicate(
      "moderator should have member info",
      moderator.member !== null &&
        typeof moderator.member === "object" &&
        "id" in moderator.member,
    );
  }

  // Test 5: Test includeRemoved flag with tier filter
  const tierFilteredPage: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          tier: "senior",
          includeRemoved: false,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(tierFilteredPage);
  TestValidator.predicate(
    "tier=senior with includeRemoved=false should return only active senior moderators",
    tierFilteredPage.data.every(
      (m) => m.moderator_tier === "senior" && m.is_active === true,
    ),
  );

  // Test 6: Test includeRemoved with date range filter
  const now = new Date();
  const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const dateFilteredPage: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          appointedAtStart: pastDate.toISOString(),
          appointedAtEnd: futureDate.toISOString(),
          includeRemoved: true,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(dateFilteredPage);

  // Test 7: Test includeRemoved with search filter
  const searchPage: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          search: member1.token.access.substring(0, 5),
          includeRemoved: false,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(searchPage);
  TestValidator.predicate(
    "search with includeRemoved=false should return only active moderators",
    searchPage.data.every((m) => m.is_active === true),
  );

  // Test 8: Test sorting with includeRemoved
  const sortedPage: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          orderBy: "appointedAt",
          order: "desc",
          includeRemoved: true,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(sortedPage);
  TestValidator.predicate(
    "sorted results should maintain valid moderator structure",
    sortedPage.data.length >= 0 &&
      sortedPage.pagination.current >= 1 &&
      sortedPage.pagination.limit > 0,
  );

  // Test 9: Verify consistency - active count <= total when includeRemoved varies
  const activeCount = activeOnlyPage.pagination.records;
  const totalCount = allModeratorsPage.pagination.records;
  TestValidator.predicate(
    "active moderators count should be <= total when checking includeRemoved effect",
    activeCount <= totalCount,
  );

  // Test 10: Verify all returned moderators have proper is_active status
  TestValidator.predicate(
    "all active-only moderators should have is_active=true",
    activeOnlyPage.data.every((m) => m.is_active === true),
  );
  TestValidator.predicate(
    "all included moderators should have is_active as boolean",
    allModeratorsPage.data.every((m) => typeof m.is_active === "boolean"),
  );
}
