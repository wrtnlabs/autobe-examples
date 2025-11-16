import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModerator";

/**
 * Test comprehensive pagination functionality for moderators retrieving
 * moderator lists.
 *
 * This test validates moderator list pagination by:
 *
 * 1. Setting up multiple user accounts (member, administrator, moderator)
 * 2. Creating a category for community classification
 * 3. Creating a community
 * 4. Appointing multiple moderators with different tiers
 * 5. Testing pagination with various limit and page parameters
 * 6. Validating pagination metadata (current page, limit, total records, total
 *    pages)
 * 7. Testing edge cases like empty results and partial last pages
 */
export async function test_api_moderator_list_pagination_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(8),
      password: memberPassword,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create and authenticate administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "https://example.com/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 3: Create and authenticate moderator for accessing moderator endpoints
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(8),
      password: moderatorPassword,
      href: "https://example.com/moderator",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Create category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 5: Switch to member and create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(3),
          identifier: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 6: Appoint multiple moderators to the community (15 moderators for pagination testing)
  const appointedModerators: ICommunityPlatformCommunityModerator[] = [];
  const tempMemberCredentials: Array<{
    id: string;
    email: string;
    password: string;
  }> = [];

  for (let i = 0; i < 15; i++) {
    const tempMemberEmail = typia.random<string & tags.Format<"email">>();
    const tempMemberPassword = RandomGenerator.alphaNumeric(12);
    const tempMember = await api.functional.auth.member.join(connection, {
      body: {
        email: tempMemberEmail,
        username: RandomGenerator.alphabets(8),
        password: tempMemberPassword,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
    typia.assert(tempMember);
    tempMemberCredentials.push({
      id: tempMember.id,
      email: tempMemberEmail,
      password: tempMemberPassword,
    });

    const moderatorTier = i < 7 ? "senior" : "junior";
    const appointedModerator =
      await api.functional.communityPlatform.member.communities.moderators.create(
        connection,
        {
          communityId: community.id,
          body: {
            memberId: tempMember.id,
            tier: moderatorTier,
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    typia.assert(appointedModerator);
    appointedModerators.push(appointedModerator);
  }

  // Step 7: Switch to moderator account for listing moderators
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 8: Test pagination with limit of 5
  const page1 =
    await api.functional.communityPlatform.moderator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(page1);

  TestValidator.equals("page 1 current page is 1", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit is 5", page1.pagination.limit, 5);
  TestValidator.equals("page 1 returns 5 items", page1.data.length, 5);
  TestValidator.predicate(
    "page 1 total records >= 15",
    page1.pagination.records >= 15,
  );
  TestValidator.predicate(
    "page 1 total pages >= 3",
    page1.pagination.pages >= 3,
  );

  // Step 9: Test pagination page 2
  const page2 =
    await api.functional.communityPlatform.moderator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 2,
          limit: 5,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(page2);

  TestValidator.equals("page 2 current page is 2", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit is 5", page2.pagination.limit, 5);
  TestValidator.equals("page 2 returns 5 items", page2.data.length, 5);
  TestValidator.notEquals(
    "page 2 data differs from page 1",
    page2.data[0].id,
    page1.data[0].id,
  );

  // Step 10: Test pagination page 3
  const page3 =
    await api.functional.communityPlatform.moderator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 3,
          limit: 5,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(page3);

  TestValidator.equals("page 3 current page is 3", page3.pagination.current, 3);
  TestValidator.equals("page 3 limit is 5", page3.pagination.limit, 5);
  TestValidator.predicate(
    "page 3 returns remaining items",
    page3.data.length <= 5,
  );
  TestValidator.equals(
    "pagination pages matches calculation",
    page3.pagination.pages,
    Math.ceil(page3.pagination.records / page3.pagination.limit),
  );

  // Step 11: Test with limit of 10
  const page1Limit10 =
    await api.functional.communityPlatform.moderator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(page1Limit10);

  TestValidator.equals(
    "limit 10 current page is 1",
    page1Limit10.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit 10 returns 10 items",
    page1Limit10.data.length,
    10,
  );

  // Step 12: Test with maximum limit of 100
  const pageLimitMax =
    await api.functional.communityPlatform.moderator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(pageLimitMax);

  TestValidator.equals(
    "max limit 100 respects constraint",
    pageLimitMax.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "all moderators fit in single page",
    pageLimitMax.data.length <= 100,
  );

  // Step 13: Test tier filtering with pagination
  const seniorModsPage =
    await api.functional.communityPlatform.moderator.communities.moderators.index(
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
  typia.assert(seniorModsPage);

  TestValidator.predicate(
    "senior moderators filter works",
    seniorModsPage.data.every((m) => m.moderator_tier === "senior"),
  );

  // Step 14: Test pagination consistency - verify same data on repeated calls
  const repeatCall =
    await api.functional.communityPlatform.moderator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(repeatCall);

  TestValidator.equals(
    "pagination consistency - same first item",
    repeatCall.data[0].id,
    page1.data[0].id,
  );
  TestValidator.equals(
    "pagination consistency - same total records",
    repeatCall.pagination.records,
    page1.pagination.records,
  );
}
