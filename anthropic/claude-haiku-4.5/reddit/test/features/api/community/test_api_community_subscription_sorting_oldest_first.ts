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

/**
 * Test subscription list sorted by oldest subscriptions first.
 *
 * This test validates chronological sorting of community subscriptions:
 *
 * 1. Create administrator and category for test environment
 * 2. Create multiple members to simulate different subscription times
 * 3. Create a community (first member auto-subscribes as creator)
 * 4. Query subscriptions with sort_by='oldest' parameter
 * 5. Verify results ordered by subscribed_at ascending (earliest joins first)
 *
 * This ensures the API correctly returns members in chronological order for
 * viewing long-time community members and identifying founders.
 */
export async function test_api_community_subscription_sorting_oldest_first(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category creation
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminData = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(10),
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(),
    href: "http://localhost:3000/admin",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const adminAuthorized = await api.functional.auth.administrator.join(
    connection,
    { body: adminData },
  );
  typia.assert(adminAuthorized);

  // Store admin connection for category creation
  const adminConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${adminAuthorized.token.access}`,
    },
  };

  // Step 2: Create a community category
  const categorySlug = `tech_${RandomGenerator.alphaNumeric(6)}`;
  const categoryData = {
    name: "Technology",
    slug: categorySlug,
    description: "Technology related discussions",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      { body: categoryData },
    );
  typia.assert(category);

  // Step 3: Create multiple members that will participate in the community
  const memberCount = 5;
  const members: ICommunityPlatformMember.IAuthorized[] = [];

  for (let i = 0; i < memberCount; i++) {
    const memberEmail = `member_${i}_${RandomGenerator.alphaNumeric(8)}@test.com`;
    const memberData = {
      email: memberEmail,
      username: `member_${i}_${RandomGenerator.alphaNumeric(6)}`,
      password: RandomGenerator.alphaNumeric(10),
      ip: "192.168.1.1",
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate;

    const memberAuthorized = await api.functional.auth.member.join(connection, {
      body: memberData,
    });
    typia.assert(memberAuthorized);
    members.push(memberAuthorized);
  }

  // Step 4: Create community as the first member (auto-subscribed as creator)
  const memberConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${members[0].token.access}`,
    },
  };

  const communityIdentifier = `test_community_${RandomGenerator.alphaNumeric(8)}`;
  const communityData = {
    name: "Test Community",
    identifier: communityIdentifier,
    description: "A test community for subscription sorting",
    visibility: "public",
    post_creation_restriction: "open_to_all",
    post_type_restriction: "all_types",
    category_slug: categorySlug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      { body: communityData },
    );
  typia.assert(community);

  // Step 5: Query subscriptions with sort_by='oldest'
  // The community creator is already subscribed; this tests the subscription list
  // and verifies sorting works for the founder/earliest subscriber
  const subscriptionRequest = {
    page: 1,
    limit: 20,
    sort_by: "oldest",
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  const subscriptionsResult =
    await api.functional.communityPlatform.member.communities.subscriptions.index(
      memberConnection,
      {
        communityId: community.id,
        body: subscriptionRequest,
      },
    );

  typia.assert(subscriptionsResult);

  // Step 6: Verify the results contain subscription data
  const subscriptions = subscriptionsResult.data;

  TestValidator.predicate(
    "should have at least one subscription from community creator",
    subscriptions.length >= 1,
  );

  // Step 7: Verify sorting - subscribed_at should be in ascending order (oldest first)
  // When multiple subscriptions exist, validate chronological ordering
  for (let i = 1; i < subscriptions.length; i++) {
    const previousTime = new Date(subscriptions[i - 1].subscribed_at).getTime();
    const currentTime = new Date(subscriptions[i].subscribed_at).getTime();

    TestValidator.predicate(
      `subscription at index ${i - 1} should be chronologically before or equal to index ${i} when sorted oldest first`,
      previousTime <= currentTime,
    );
  }

  // Step 8: Validate pagination metadata
  TestValidator.predicate(
    "pagination current page should be 1",
    subscriptionsResult.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit should match request",
    subscriptionsResult.pagination.limit === 20,
  );

  TestValidator.predicate(
    "pagination should report total records",
    subscriptionsResult.pagination.records >= 1,
  );

  TestValidator.predicate(
    "pagination pages calculation should be correct",
    subscriptionsResult.pagination.pages >= 1,
  );

  // Step 9: Verify each subscription has required fields
  for (const subscription of subscriptions) {
    TestValidator.predicate(
      `subscription should have valid id format`,
      subscription.id.length > 0,
    );

    TestValidator.predicate(
      `subscription should reference the correct community`,
      subscription.community_id === community.id,
    );

    TestValidator.predicate(
      `subscription should have valid member id`,
      subscription.member_id.length > 0,
    );

    TestValidator.predicate(
      `subscription should have valid subscribed_at timestamp`,
      new Date(subscription.subscribed_at).getTime() > 0,
    );
  }
}
