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
 * Comprehensive subscription search validation with pagination and sorting
 *
 * This E2E test validates the subscription search API's pagination
 * capabilities, sorting functionality, and filtering options. It creates a
 * realistic scenario where a member subscribes to multiple communities and then
 * performs various search operations to ensure the API correctly handles
 * pagination metadata, result ordering, and filtering parameters.
 */
export async function test_api_member_subscription_search_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/registration",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create three distinct communities with unique names
  const communities: ICommunityPlatformCommunity[] = [];
  const communityNames: string[] = [];

  for (let i = 0; i < 3; i++) {
    const communityName = RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    });
    communityNames.push(communityName);

    const community =
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: communityName,
            slug: RandomGenerator.alphaNumeric(10),
            description: RandomGenerator.content({
              paragraphs: 1,
              sentenceMin: 3,
              sentenceMax: 6,
            }),
            privacy: "public",
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    typia.assert(community);
    communities.push(community);
  }

  // Step 3: Create subscriptions to all communities with slight delays to ensure different timestamps
  const subscriptions: ICommunityPlatformSubscription[] = [];

  for (const community of communities) {
    const subscription =
      await api.functional.communityPlatform.member.subscriptions.create(
        connection,
        {
          body: {
            community_platform_member_id: member.id,
            community_platform_community_id: community.id,
            status: "active",
          } satisfies ICommunityPlatformSubscription.ICreate,
        },
      );
    typia.assert(subscription);
    subscriptions.push(subscription);
  }

  // Step 4: Test pagination with different page sizes
  const pageSizes = [1, 2, 3] as const;

  for (const limit of pageSizes) {
    const searchResult =
      await api.functional.communityPlatform.member.subscriptions.index(
        connection,
        {
          body: {
            page: 1,
            limit: limit,
            order_by: "created_at",
            order_direction: "asc",
          } satisfies ICommunityPlatformSubscription.IRequest,
        },
      );
    typia.assert(searchResult);

    TestValidator.equals(
      `page size ${limit} returns correct number of items`,
      searchResult.data.length,
      Math.min(limit, subscriptions.length),
    );

    TestValidator.predicate(
      `pagination metadata is accurate for limit ${limit}`,
      searchResult.pagination.current === 1 &&
        searchResult.pagination.limit === limit &&
        searchResult.pagination.records === subscriptions.length &&
        searchResult.pagination.pages ===
          Math.ceil(subscriptions.length / limit),
    );
  }

  // Step 5: Test sorting by creation date (ascending)
  const ascendingResult =
    await api.functional.communityPlatform.member.subscriptions.index(
      connection,
      {
        body: {
          page: 1,
          limit: subscriptions.length,
          order_by: "created_at",
          order_direction: "asc",
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(ascendingResult);

  // Verify ascending order and that all subscriptions are present
  TestValidator.equals(
    "ascending search returns all subscriptions",
    ascendingResult.data.length,
    subscriptions.length,
  );

  for (let i = 1; i < ascendingResult.data.length; i++) {
    const currentDate = new Date(ascendingResult.data[i].created_at);
    const previousDate = new Date(ascendingResult.data[i - 1].created_at);
    TestValidator.predicate(
      "ascending order by creation date",
      currentDate >= previousDate,
    );
  }

  // Step 6: Test sorting by creation date (descending)
  const descendingResult =
    await api.functional.communityPlatform.member.subscriptions.index(
      connection,
      {
        body: {
          page: 1,
          limit: subscriptions.length,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(descendingResult);

  // Verify descending order and that all subscriptions are present
  TestValidator.equals(
    "descending search returns all subscriptions",
    descendingResult.data.length,
    subscriptions.length,
  );

  for (let i = 1; i < descendingResult.data.length; i++) {
    const currentDate = new Date(descendingResult.data[i].created_at);
    const previousDate = new Date(descendingResult.data[i - 1].created_at);
    TestValidator.predicate(
      "descending order by creation date",
      currentDate <= previousDate,
    );
  }

  // Step 7: Test sorting by update date
  const updateDateResult =
    await api.functional.communityPlatform.member.subscriptions.index(
      connection,
      {
        body: {
          page: 1,
          limit: subscriptions.length,
          order_by: "updated_at",
          order_direction: "desc",
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(updateDateResult);

  // Verify update date ordering
  for (let i = 1; i < updateDateResult.data.length; i++) {
    const currentDate = new Date(updateDateResult.data[i].updated_at);
    const previousDate = new Date(updateDateResult.data[i - 1].updated_at);
    TestValidator.predicate(
      "descending order by update date",
      currentDate <= previousDate,
    );
  }

  // Step 8: Test status filtering
  const activeResult =
    await api.functional.communityPlatform.member.subscriptions.index(
      connection,
      {
        body: {
          page: 1,
          limit: subscriptions.length,
          status: "active",
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(activeResult);

  TestValidator.predicate(
    "active status filter returns only active subscriptions",
    activeResult.data.every((sub) => sub.status === "active"),
  );

  TestValidator.equals(
    "active status filter returns correct number of subscriptions",
    activeResult.data.length,
    subscriptions.length,
  );

  // Step 9: Test search functionality with community name
  const searchQuery = communityNames[0].substring(0, 5); // Use first few characters of first community name
  const searchResult =
    await api.functional.communityPlatform.member.subscriptions.index(
      connection,
      {
        body: {
          page: 1,
          limit: subscriptions.length,
          search: searchQuery,
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(searchResult);

  TestValidator.predicate(
    "search returns subscriptions matching the query",
    searchResult.data.length > 0 &&
      searchResult.data.every((sub) =>
        sub.community.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
  );

  // Step 10: Test pagination beyond available data
  const emptyPageResult =
    await api.functional.communityPlatform.member.subscriptions.index(
      connection,
      {
        body: {
          page: 10, // Page beyond available data
          limit: 1,
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(emptyPageResult);

  TestValidator.equals(
    "empty page returns no data",
    emptyPageResult.data.length,
    0,
  );

  TestValidator.predicate(
    "pagination metadata for empty page is correct",
    emptyPageResult.pagination.current === 10 &&
      emptyPageResult.pagination.records === subscriptions.length &&
      emptyPageResult.pagination.pages === Math.ceil(subscriptions.length / 1),
  );

  // Step 11: Verify all created subscriptions are retrievable
  const allSubscriptionsResult =
    await api.functional.communityPlatform.member.subscriptions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100, // Large enough to get all subscriptions
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(allSubscriptionsResult);

  TestValidator.equals(
    "all created subscriptions are retrievable",
    allSubscriptionsResult.data.length,
    subscriptions.length,
  );

  // Step 12: Verify subscription data integrity
  for (const subscription of allSubscriptionsResult.data) {
    TestValidator.predicate(
      "subscription has valid member reference",
      subscription.member.id === member.id,
    );

    TestValidator.predicate(
      "subscription has valid community reference",
      communities.some(
        (community) => community.id === subscription.community.id,
      ),
    );

    TestValidator.predicate(
      "subscription has valid status",
      subscription.status === "active",
    );

    TestValidator.predicate(
      "subscription has valid timestamps",
      subscription.created_at !== null &&
        subscription.updated_at !== null &&
        new Date(subscription.created_at) <= new Date(subscription.updated_at),
    );
  }

  // Step 13: Test invalid status filter (should return empty)
  const invalidStatusResult =
    await api.functional.communityPlatform.member.subscriptions.index(
      connection,
      {
        body: {
          page: 1,
          limit: subscriptions.length,
          status: "pending", // No pending subscriptions were created
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(invalidStatusResult);

  TestValidator.equals(
    "invalid status filter returns empty result",
    invalidStatusResult.data.length,
    0,
  );
}
