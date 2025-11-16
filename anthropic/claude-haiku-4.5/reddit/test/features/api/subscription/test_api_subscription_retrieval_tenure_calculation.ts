import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test subscription timestamp usage for member tenure calculations.
 *
 * Verifies that subscription records accurately capture the timestamp when a
 * member joins a community. The subscribed_at field is immutable and serves as
 * the definitive record for calculating member tenure, displaying join dates,
 * and implementing tenure-based access controls and seniority features.
 *
 * This test validates:
 *
 * 1. Subscription creation captures accurate join timestamp
 * 2. Timestamp is retrievable in ISO 8601 date-time format
 * 3. Timestamp can be used for tenure calculations
 * 4. Subscription record structure is complete and valid
 */
export async function test_api_subscription_retrieval_tenure_calculation(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category creation
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminData = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(10),
    username: `admin_${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(),
    href: "https://example.com/admin/join",
    referrer: "https://example.com",
    ip: "127.0.0.1",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const adminAuthorized = await api.functional.auth.administrator.join(
    connection,
    { body: adminData },
  );
  typia.assert(adminAuthorized);

  const adminConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: adminAuthorized.token.access,
    },
  };

  // Step 2: Create a community category
  const categoryData = {
    name: `Category_${RandomGenerator.alphaNumeric(6)}`,
    slug: `category-${RandomGenerator.alphaNumeric(6).toLowerCase()}`,
    display_order: 1,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    icon_url: "https://example.com/icons/tech.png",
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      { body: categoryData },
    );
  typia.assert(category);

  // Step 3: Create first member account and authenticate
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const memberPassword = RandomGenerator.alphaNumeric(10);
  const memberData = {
    email: memberEmail,
    username: `member_${RandomGenerator.alphaNumeric(6)}`,
    password: memberPassword,
    href: "https://example.com/join",
    referrer: "https://example.com",
    ip: "127.0.0.1",
  } satisfies ICommunityPlatformMember.ICreate;

  const memberAuthorized = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(memberAuthorized);

  const memberConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: memberAuthorized.token.access,
    },
  };

  // Step 4: Create a community
  const communityData = {
    name: `Community_${RandomGenerator.alphaNumeric(6)}`,
    identifier: `community_${RandomGenerator.alphaNumeric(6).toLowerCase()}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibility: "public",
    post_creation_restriction: "open_to_all",
    post_type_restriction: "all_types",
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      { body: communityData },
    );
  typia.assert(community);

  // Step 5: Create second member account for subscription testing
  const secondaryMemberEmail = `member_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const secondaryMemberPassword = RandomGenerator.alphaNumeric(10);
  const secondaryMemberData = {
    email: secondaryMemberEmail,
    username: `member_${RandomGenerator.alphaNumeric(6)}`,
    password: secondaryMemberPassword,
    href: "https://example.com/join",
    referrer: "https://example.com",
    ip: "127.0.0.1",
  } satisfies ICommunityPlatformMember.ICreate;

  const secondaryMemberAuthorized = await api.functional.auth.member.join(
    connection,
    { body: secondaryMemberData },
  );
  typia.assert(secondaryMemberAuthorized);

  const secondaryMemberConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: secondaryMemberAuthorized.token.access,
    },
  };

  // Step 6: Subscribe secondary member to the community
  const beforeSubscriptionTime = new Date();

  const subscriptionData = {
    community_id: community.id,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription =
    await api.functional.communityPlatform.member.communities.subscriptions.create(
      secondaryMemberConnection,
      { communityId: community.id, body: subscriptionData },
    );
  typia.assert(subscription);

  const afterSubscriptionTime = new Date();

  // Step 7: Retrieve the subscription record
  const retrievedSubscription =
    await api.functional.communityPlatform.member.communities.subscriptions.at(
      secondaryMemberConnection,
      { communityId: community.id, subscriptionId: subscription.id },
    );
  typia.assert(retrievedSubscription);

  // Step 8: Validate subscription structure and timestamps
  TestValidator.equals(
    "subscription ID should match",
    retrievedSubscription.id,
    subscription.id,
  );

  TestValidator.equals(
    "community ID should match",
    retrievedSubscription.community.id,
    community.id,
  );

  TestValidator.equals(
    "community identifier should match",
    retrievedSubscription.community.identifier,
    community.identifier,
  );

  TestValidator.equals(
    "member ID should match subscriber",
    retrievedSubscription.member.id,
    secondaryMemberAuthorized.id,
  );

  TestValidator.equals(
    "member email should match subscriber",
    retrievedSubscription.member.email,
    secondaryMemberEmail,
  );

  // Validate subscribed_at timestamp
  TestValidator.predicate(
    "subscribed_at should be valid ISO 8601 date-time",
    () => {
      const timestamp = new Date(retrievedSubscription.subscribed_at);
      return !isNaN(timestamp.getTime());
    },
  );

  TestValidator.predicate(
    "subscribed_at should be recent (within subscription window)",
    () => {
      const subscribedAtTime = new Date(retrievedSubscription.subscribed_at);
      return (
        subscribedAtTime >= beforeSubscriptionTime &&
        subscribedAtTime <= afterSubscriptionTime
      );
    },
  );

  // Validate created_at timestamp
  TestValidator.predicate(
    "created_at should be valid ISO 8601 date-time",
    () => {
      const timestamp = new Date(retrievedSubscription.created_at);
      return !isNaN(timestamp.getTime());
    },
  );

  TestValidator.equals(
    "created_at should match subscribed_at for new subscription",
    retrievedSubscription.created_at,
    retrievedSubscription.subscribed_at,
  );

  // Step 9: Validate tenure calculation capability
  const subscribedAtDate = new Date(retrievedSubscription.subscribed_at);
  const currentDate = new Date();
  const tenureInMilliseconds =
    currentDate.getTime() - subscribedAtDate.getTime();

  TestValidator.predicate(
    "tenure calculation should be possible (subscribed_at is before current time)",
    tenureInMilliseconds >= 0,
  );

  TestValidator.predicate(
    "tenure should be recent (just subscribed)",
    tenureInMilliseconds < 60000, // Should be within last 60 seconds
  );
}
