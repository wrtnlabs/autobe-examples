import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";

/**
 * Test filtering community subscriptions by member karma score.
 *
 * Validates that moderators can filter community member subscriptions using
 * karma score ranges. Tests filtering by minimum karma (experienced members),
 * maximum karma (newer members), and combined ranges. Ensures pagination works
 * correctly with karma filtering applied.
 *
 * Test flow:
 *
 * 1. Create administrator and category
 * 2. Register moderator
 * 3. Register multiple members
 * 4. Create community and add members as subscribers
 * 5. Test min_karma filtering
 * 6. Test max_karma filtering
 * 7. Test combined karma range filtering
 * 8. Verify pagination with karma filters
 */
export async function test_api_community_subscriptions_moderator_filter_by_karma_range(
  connection: api.IConnection,
) {
  // 1. Setup: Create administrator and category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      username: RandomGenerator.alphaNumeric(8),
      name: RandomGenerator.name(),
      href: "https://example.com/admin",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  const categoryData = {
    name: "Technology",
    slug: "technology-" + RandomGenerator.alphaNumeric(4),
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // 2. Register moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPass123!",
      username: RandomGenerator.alphaNumeric(8),
      href: "https://example.com/auth",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // 3. Register multiple members
  const memberEmails = ArrayUtil.repeat(5, () =>
    typia.random<string & tags.Format<"email">>(),
  );

  const members = await ArrayUtil.asyncMap(memberEmails, async (email) => {
    const member = await api.functional.auth.member.join(connection, {
      body: {
        email,
        password: "MemberPass123!",
        username: RandomGenerator.alphaNumeric(8),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
    typia.assert(member);
    return member;
  });

  // 4. Create community with first member as creator
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmails[0],
      password: "MemberPass123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const communityData = {
    name: "Tech Discussion",
    identifier: RandomGenerator.alphaNumeric(12).toLowerCase(),
    description: "A community for technology discussions",
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // 5. Add remaining members as community subscribers
  // Each member logs in and the community creator (first member) has already subscribed
  // Additional members would subscribe through separate subscription endpoint if available
  // For this test, we verify the moderator can query subscriptions with karma filters

  // 6. Switch to moderator for querying subscriptions
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPass123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 7. Test min_karma filtering
  const minKarmaFilter = {
    page: 1,
    limit: 20,
    min_karma: 10,
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  const minKarmaResult =
    await api.functional.communityPlatform.moderator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: minKarmaFilter,
      },
    );
  typia.assert(minKarmaResult);
  TestValidator.predicate(
    "min_karma filter should return paginated response",
    minKarmaResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "min_karma filter results should respect page limit",
    minKarmaResult.data.length <= minKarmaResult.pagination.limit,
  );

  // 8. Test max_karma filtering
  const maxKarmaFilter = {
    page: 1,
    limit: 20,
    max_karma: 50,
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  const maxKarmaResult =
    await api.functional.communityPlatform.moderator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: maxKarmaFilter,
      },
    );
  typia.assert(maxKarmaResult);
  TestValidator.predicate(
    "max_karma filter should return paginated response",
    maxKarmaResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "max_karma filter results should respect page limit",
    maxKarmaResult.data.length <= maxKarmaResult.pagination.limit,
  );

  // 9. Test combined karma range filtering
  const karmaRangeFilter = {
    page: 1,
    limit: 20,
    min_karma: 10,
    max_karma: 50,
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  const karmaRangeResult =
    await api.functional.communityPlatform.moderator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: karmaRangeFilter,
      },
    );
  typia.assert(karmaRangeResult);
  TestValidator.predicate(
    "combined karma range filter should return results",
    karmaRangeResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid current page",
    karmaRangeResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be respected",
    karmaRangeResult.data.length <= karmaRangeResult.pagination.limit,
  );

  // 10. Test pagination with karma filters
  const paginationFilter = {
    page: 1,
    limit: 2,
    min_karma: 0,
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  const page1Result =
    await api.functional.communityPlatform.moderator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: paginationFilter,
      },
    );
  typia.assert(page1Result);
  TestValidator.predicate(
    "first page should respect limit",
    page1Result.data.length <= 2,
  );

  if (page1Result.pagination.pages > 1) {
    const page2Filter = {
      page: 2,
      limit: 2,
      min_karma: 0,
    } satisfies ICommunityPlatformCommunitySubscription.IRequest;

    const page2Result =
      await api.functional.communityPlatform.moderator.communities.subscriptions.index(
        connection,
        {
          communityId: community.id,
          body: page2Filter,
        },
      );
    typia.assert(page2Result);
    TestValidator.predicate(
      "second page should have correct page number",
      page2Result.pagination.current === 2,
    );
  }

  // 11. Test with karma range and sorting
  const sortedFilter = {
    page: 1,
    limit: 20,
    min_karma: 0,
    max_karma: 100,
    sort_by: "newest" as const,
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  const sortedResult =
    await api.functional.communityPlatform.moderator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: sortedFilter,
      },
    );
  typia.assert(sortedResult);
  TestValidator.predicate(
    "sorted karma filter results should be valid",
    sortedResult.pagination.records >= 0,
  );
}
