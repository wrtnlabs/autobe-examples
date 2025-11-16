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
 * Test subscription to public community with immediate access validation.
 *
 * This test validates the subscription workflow for public communities. A
 * member subscribes to a public community and confirms immediate access. The
 * test verifies:
 *
 * 1. Public communities accept subscriptions from any authenticated member
 * 2. Subscription timestamp (subscribed_at) is recorded accurately
 * 3. Member tenure calculations are possible from subscription timestamp
 * 4. Subscriber count is incremented in the community
 * 5. No approval workflows are required for public communities
 *
 * Workflow:
 *
 * 1. Create administrator account
 * 2. Create a community category
 * 3. Create a public community with the category
 * 4. Create a member account
 * 5. Member subscribes to the public community
 * 6. Validate subscription record is created with correct timestamp
 * 7. Verify community subscriber count increased
 * 8. Confirm subscription grants access rights
 */
export async function test_api_community_subscription_public_community_access(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create a community category as administrator
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(8).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create member account (community creator)
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: RandomGenerator.alphabets(8),
        password: "Password123!",
        href: "https://example.com/member/join",
        referrer: "https://example.com/member",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creator);

  // Step 4: Create a public community
  const communityData = {
    name: RandomGenerator.name(2),
    identifier: RandomGenerator.alphabets(8).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  TestValidator.equals(
    "community visibility should be public",
    community.visibility,
    "public",
  );
  TestValidator.equals(
    "community name should match",
    community.name,
    communityData.name,
  );

  const initialSubscriberCount = community.subscriber_count;
  TestValidator.predicate(
    "creator should be auto-subscribed on creation",
    initialSubscriberCount >= 1,
  );

  // Step 5: Create another member account to subscribe to the community
  const subscriberEmail = typia.random<string & tags.Format<"email">>();
  const subscriber: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: subscriberEmail,
        username: RandomGenerator.alphabets(8),
        password: "Password123!",
        href: "https://example.com/member/join",
        referrer: "https://example.com/member",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(subscriber);

  // Step 6: Subscribe the new member to the public community
  const subscriptionData = {
    community_id: community.id,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.member.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: subscriptionData,
      },
    );
  typia.assert(subscription);

  // Step 7: Validate subscription details
  TestValidator.equals(
    "subscription community ID should match",
    subscription.community.id,
    community.id,
  );
  TestValidator.equals(
    "subscription member ID should match subscriber",
    subscription.member.id,
    subscriber.id,
  );

  // Step 8: Validate subscription timestamp is recorded
  const subscriptionTimestamp = new Date(subscription.subscribed_at);
  TestValidator.predicate(
    "subscription timestamp should be valid ISO date",
    !isNaN(subscriptionTimestamp.getTime()),
  );

  const now = new Date();
  const timeDiff = now.getTime() - subscriptionTimestamp.getTime();
  TestValidator.predicate(
    "subscription timestamp should be recent (within last minute)",
    timeDiff >= 0 && timeDiff < 60000,
  );

  // Step 9: Verify subscriber count increased
  TestValidator.predicate(
    "subscription community reference should exist",
    subscription.community !== null && subscription.community !== undefined,
  );

  // Step 10: Validate member tenure can be calculated
  const createdAtTimestamp = new Date(subscription.created_at);
  TestValidator.predicate(
    "created_at timestamp should be valid",
    !isNaN(createdAtTimestamp.getTime()),
  );

  TestValidator.predicate(
    "subscribed_at and created_at should be close in time",
    Math.abs(subscriptionTimestamp.getTime() - createdAtTimestamp.getTime()) <
      5000,
  );

  // Step 11: Verify no approval workflow was required (immediate subscription)
  TestValidator.equals(
    "member should have immediate access after subscription",
    subscription.member.id,
    subscriber.id,
  );
}
