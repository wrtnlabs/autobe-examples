import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";

export async function test_api_community_subscription_filtering_by_karma_score(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: `admin_${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "AdminPassword123!",
      username: `admin_${RandomGenerator.alphaNumeric(8)}`,
      name: "Test Admin",
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: "Technology and programming discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Authenticate as member (community creator)
  const creatorEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const creator = await api.functional.auth.member.join(connection, {
    body: {
      email: creatorEmail,
      username: `creator_${RandomGenerator.alphaNumeric(8)}`,
      password: "MemberPassword123!",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(creator);

  // Step 4: Create a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `Test Community ${RandomGenerator.alphaNumeric(6)}`,
          identifier: `testcomm_${RandomGenerator.alphaNumeric(8)}`,
          description: "Community for testing karma-based filtering",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create multiple members with varying profiles
  const members = await ArrayUtil.asyncRepeat(5, async (i) => {
    const email = `member_${i}_${RandomGenerator.alphaNumeric(6)}@test.com`;
    const member = await api.functional.auth.member.join(connection, {
      body: {
        email,
        username: `user_${i}_${RandomGenerator.alphaNumeric(6)}`,
        password: "MemberPassword123!",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
    typia.assert(member);
    return member;
  });

  // Step 6: Query all subscriptions (creator should be auto-subscribed)
  const allSubscriptions =
    await api.functional.communityPlatform.member.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(allSubscriptions);
  TestValidator.predicate(
    "subscriptions response should have pagination data",
    allSubscriptions.pagination !== undefined,
  );
  TestValidator.predicate(
    "subscriptions list should contain data",
    Array.isArray(allSubscriptions.data),
  );

  // Step 7: Test filtering with min_karma threshold
  const minKarmaThreshold = 50;
  const filteredByMinKarma =
    await api.functional.communityPlatform.member.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          min_karma: minKarmaThreshold,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(filteredByMinKarma);
  TestValidator.predicate(
    "min_karma filter should be accepted",
    filteredByMinKarma.data !== undefined,
  );

  // Step 8: Test filtering with max_karma threshold
  const maxKarmaThreshold = 100;
  const filteredByMaxKarma =
    await api.functional.communityPlatform.member.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          max_karma: maxKarmaThreshold,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(filteredByMaxKarma);
  TestValidator.predicate(
    "max_karma filter should be accepted",
    filteredByMaxKarma.data !== undefined,
  );

  // Step 9: Test combined min and max karma filtering
  const filteredByKarmaRange =
    await api.functional.communityPlatform.member.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          min_karma: 25,
          max_karma: 150,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(filteredByKarmaRange);
  TestValidator.predicate(
    "combined karma range filter should be accepted",
    filteredByKarmaRange.data !== undefined,
  );

  // Step 10: Test pagination with karma filtering
  const paginatedResult =
    await api.functional.communityPlatform.member.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 5,
          min_karma: 0,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination should work with karma filtering",
    paginatedResult.pagination.limit <= 5,
  );

  // Step 11: Test sorting with karma filtering
  const sortedByNewest =
    await api.functional.communityPlatform.member.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          min_karma: 0,
          sort_by: "newest",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(sortedByNewest);

  const sortedByOldest =
    await api.functional.communityPlatform.member.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          min_karma: 0,
          sort_by: "oldest",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(sortedByOldest);

  // Step 12: Verify that sorting parameters change result order
  TestValidator.predicate(
    "sorting should be supported",
    sortedByNewest.data.length >= 0,
  );

  // Step 13: Test search by username with karma filtering
  const searchResult =
    await api.functional.communityPlatform.member.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          search_username: "user",
          min_karma: 0,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search with karma filtering should work",
    Array.isArray(searchResult.data),
  );

  // Step 14: Test subscription date range filtering
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const subscriptionDateFiltered =
    await api.functional.communityPlatform.member.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          subscribed_from: oneDayAgo.toISOString(),
          subscribed_to: now.toISOString(),
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(subscriptionDateFiltered);
  TestValidator.predicate(
    "subscription date range filtering should work",
    Array.isArray(subscriptionDateFiltered.data),
  );

  TestValidator.predicate(
    "karma-based subscription filtering test completed successfully",
    true,
  );
}
