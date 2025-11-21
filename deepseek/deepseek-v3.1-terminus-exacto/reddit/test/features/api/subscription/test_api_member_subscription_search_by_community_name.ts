import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSubscription";

/**
 * Test subscription search using free-text search functionality to find
 * subscriptions by community name patterns.
 *
 * This test validates the subscription search feature by creating communities
 * with distinct naming patterns, subscribing to them, and then performing
 * searches using partial community names and keywords. It ensures that
 * substring matching, search relevance, and proper filtering of subscription
 * results work correctly.
 */
export async function test_api_member_subscription_search_by_community_name(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create first community with specific naming pattern
  const community1 =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Technology Programming Community",
          slug: "tech-programming",
          description: RandomGenerator.content({ paragraphs: 2 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);

  // Step 3: Create second community with different naming pattern
  const community2 =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Art Design Community",
          slug: "art-design",
          description: RandomGenerator.content({ paragraphs: 2 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);

  // Step 4: Subscribe to first community
  const subscription1 =
    await api.functional.communityPlatform.member.subscriptions.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_community_id: community1.id,
          status: "active",
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription1);

  // Step 5: Subscribe to second community
  const subscription2 =
    await api.functional.communityPlatform.member.subscriptions.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_community_id: community2.id,
          status: "active",
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription2);

  // Step 6: Test search with partial community name "Technology"
  const searchResults1 =
    await api.functional.communityPlatform.member.subscriptions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          search: "Technology",
          status: "active",
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(searchResults1);

  // Validate that search for "Technology" returns only the technology community subscription
  TestValidator.equals(
    "search for Technology should return exactly one result",
    searchResults1.data.length,
    1,
  );
  TestValidator.equals(
    "search result should match technology community",
    searchResults1.data[0].community.name,
    "Technology Programming Community",
  );

  // Step 7: Test search with partial community name "Art"
  const searchResults2 =
    await api.functional.communityPlatform.member.subscriptions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          search: "Art",
          status: "active",
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(searchResults2);

  // Validate that search for "Art" returns only the art community subscription
  TestValidator.equals(
    "search for Art should return exactly one result",
    searchResults2.data.length,
    1,
  );
  TestValidator.equals(
    "search result should match art community",
    searchResults2.data[0].community.name,
    "Art Design Community",
  );

  // Step 8: Test search with keyword "Community" (should return both subscriptions)
  const searchResults3 =
    await api.functional.communityPlatform.member.subscriptions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          search: "Community",
          status: "active",
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(searchResults3);

  // Validate that search for "Community" returns both subscriptions
  TestValidator.equals(
    "search for Community should return both subscriptions",
    searchResults3.data.length,
    2,
  );

  // Step 9: Test search with non-matching term (should return empty results)
  const searchResults4 =
    await api.functional.communityPlatform.member.subscriptions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          search: "NonExistentCommunity",
          status: "active",
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(searchResults4);

  // Validate that search for non-existent term returns no results
  TestValidator.equals(
    "search for non-existent term should return empty results",
    searchResults4.data.length,
    0,
  );

  // Step 10: Test search without search term (should return all subscriptions)
  const searchResults5 =
    await api.functional.communityPlatform.member.subscriptions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "active",
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(searchResults5);

  // Validate that search without term returns all active subscriptions
  TestValidator.equals(
    "search without term should return all active subscriptions",
    searchResults5.data.length,
    2,
  );

  // Step 11: Validate pagination metadata
  TestValidator.equals(
    "pagination current page should be 1",
    searchResults5.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    searchResults5.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records should match total subscriptions",
    searchResults5.pagination.records,
    2,
  );
  TestValidator.equals(
    "pagination pages should be 1",
    searchResults5.pagination.pages,
    1,
  );

  // Step 12: Test search with case sensitivity
  const searchResults6 =
    await api.functional.communityPlatform.member.subscriptions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          search: "technology", // lowercase
          status: "active",
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(searchResults6);

  // Validate case-insensitive search
  TestValidator.equals(
    "case-insensitive search should return results",
    searchResults6.data.length,
    1,
  );
}
