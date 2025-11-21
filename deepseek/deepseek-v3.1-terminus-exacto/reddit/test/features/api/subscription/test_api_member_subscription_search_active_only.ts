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
 * Test subscription search functionality focusing on active subscriptions.
 *
 * This E2E test validates that the subscription search API correctly filters
 * and returns only active subscriptions when the status filter is set to
 * 'active'. The test creates multiple communities and subscriptions with
 * different statuses, then performs targeted search for active-only
 * subscriptions to ensure proper filtering and result isolation based on
 * subscription state.
 */
export async function test_api_member_subscription_search_active_only(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "testPassword123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create first community for active subscription
  const community1 =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphabets(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);

  // Step 3: Create second community for inactive subscription
  const community2 =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphabets(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);

  // Step 4: Create active subscription to first community
  const activeSubscription =
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
  typia.assert(activeSubscription);

  // Step 5: Create inactive subscription to second community
  const inactiveSubscription =
    await api.functional.communityPlatform.member.subscriptions.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_community_id: community2.id,
          status: "inactive",
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(inactiveSubscription);

  // Step 6: Perform search with active status filter
  const searchResult =
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
  typia.assert(searchResult);

  // Step 7: Validate that only active subscriptions are returned
  TestValidator.equals(
    "search result should contain exactly one active subscription",
    searchResult.data.length,
    1,
  );

  TestValidator.equals(
    "returned subscription should be the active one",
    searchResult.data[0].id,
    activeSubscription.id,
  );

  TestValidator.equals(
    "subscription status should be active",
    searchResult.data[0].status,
    "active",
  );

  TestValidator.equals(
    "subscription should reference the correct community",
    searchResult.data[0].community.id,
    community1.id,
  );

  TestValidator.equals(
    "subscription should reference the correct member",
    searchResult.data[0].member.id,
    member.id,
  );

  // Step 8: Validate subscription timestamps
  TestValidator.predicate(
    "created_at timestamp should be valid",
    searchResult.data[0].created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at timestamp should be valid",
    searchResult.data[0].updated_at.length > 0,
  );

  // Step 9: Validate pagination metadata
  TestValidator.equals(
    "pagination should indicate exactly one record",
    searchResult.pagination.records,
    1,
  );

  TestValidator.equals(
    "current page should be 1",
    searchResult.pagination.current,
    1,
  );

  TestValidator.equals("limit should be 10", searchResult.pagination.limit, 10);

  TestValidator.equals(
    "total pages should be 1",
    searchResult.pagination.pages,
    1,
  );

  // Step 10: Verify that inactive subscription is not included
  TestValidator.predicate(
    "inactive subscription should not be in search results",
    !searchResult.data.some((sub) => sub.id === inactiveSubscription.id),
  );

  // Step 11: Additional validation - search without status filter should return both subscriptions
  const allSubscriptionsResult =
    await api.functional.communityPlatform.member.subscriptions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(allSubscriptionsResult);

  TestValidator.equals(
    "search without filter should return both subscriptions",
    allSubscriptionsResult.data.length,
    2,
  );

  TestValidator.predicate(
    "both subscriptions should be present in unfiltered search",
    allSubscriptionsResult.data.some(
      (sub) => sub.id === activeSubscription.id,
    ) &&
      allSubscriptionsResult.data.some(
        (sub) => sub.id === inactiveSubscription.id,
      ),
  );
}
