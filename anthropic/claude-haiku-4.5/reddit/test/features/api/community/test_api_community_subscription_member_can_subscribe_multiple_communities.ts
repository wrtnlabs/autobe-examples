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
 * Test that a single member can subscribe to multiple different communities.
 *
 * This test validates the M:N relationship between members and communities,
 * ensuring a member can maintain multiple independent subscriptions across
 * different communities. The test workflow:
 *
 * 1. Create an administrator account and a category for communities
 * 2. Create three distinct communities in the same category
 * 3. Register a member account
 * 4. Subscribe the member to Community A, B, and C sequentially
 * 5. Validate each subscription has unique subscription ID
 * 6. Verify subscriber counts are properly incremented for each community
 * 7. Confirm the member maintains independent subscriptions across all communities
 */
export async function test_api_community_subscription_member_can_subscribe_multiple_communities(
  connection: api.IConnection,
) {
  // Store the initial subscriber counts (creators auto-subscribe)
  const initialSubscriberCount = 1;

  // Setup: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost/admin",
        referrer: "http://localhost",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Create a category for the communities
  const category: ICommunityPlatformCategory =
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

  // Setup: Register a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: memberPassword,
        href: "http://localhost/join",
        referrer: "http://localhost",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Create three communities
  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Community A",
          identifier: `community_a_${RandomGenerator.alphabets(4).toLowerCase()}`,
          description: "First test community",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);
  TestValidator.equals(
    "Community A initial subscriber count should include creator",
    communityA.subscriber_count,
    initialSubscriberCount,
  );

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Community B",
          identifier: `community_b_${RandomGenerator.alphabets(4).toLowerCase()}`,
          description: "Second test community",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityB);
  TestValidator.equals(
    "Community B initial subscriber count should include creator",
    communityB.subscriber_count,
    initialSubscriberCount,
  );

  const communityC: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Community C",
          identifier: `community_c_${RandomGenerator.alphabets(4).toLowerCase()}`,
          description: "Third test community",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityC);
  TestValidator.equals(
    "Community C initial subscriber count should include creator",
    communityC.subscriber_count,
    initialSubscriberCount,
  );

  // Switch to member account for subscriptions
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "http://localhost/login",
      referrer: "http://localhost",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Subscribe to Community A
  const subscriptionA: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.member.communities.subscriptions.create(
      connection,
      {
        communityId: communityA.id,
        body: {
          community_id: communityA.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscriptionA);

  // Subscribe to Community B
  const subscriptionB: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.member.communities.subscriptions.create(
      connection,
      {
        communityId: communityB.id,
        body: {
          community_id: communityB.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscriptionB);

  // Subscribe to Community C
  const subscriptionC: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.member.communities.subscriptions.create(
      connection,
      {
        communityId: communityC.id,
        body: {
          community_id: communityC.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscriptionC);

  // Validate subscriptions have unique IDs
  TestValidator.notEquals(
    "subscription A and B should have different IDs",
    subscriptionA.id,
    subscriptionB.id,
  );
  TestValidator.notEquals(
    "subscription B and C should have different IDs",
    subscriptionB.id,
    subscriptionC.id,
  );
  TestValidator.notEquals(
    "subscription A and C should have different IDs",
    subscriptionA.id,
    subscriptionC.id,
  );

  // Validate subscription timestamps are recorded
  TestValidator.predicate(
    "subscription A has valid subscribed_at timestamp",
    subscriptionA.subscribed_at !== null &&
      subscriptionA.subscribed_at !== undefined,
  );
  TestValidator.predicate(
    "subscription B has valid subscribed_at timestamp",
    subscriptionB.subscribed_at !== null &&
      subscriptionB.subscribed_at !== undefined,
  );
  TestValidator.predicate(
    "subscription C has valid subscribed_at timestamp",
    subscriptionC.subscribed_at !== null &&
      subscriptionC.subscribed_at !== undefined,
  );

  // Validate member information in subscriptions
  TestValidator.equals(
    "subscription A member matches member account",
    subscriptionA.member.id,
    member.id,
  );
  TestValidator.equals(
    "subscription B member matches member account",
    subscriptionB.member.id,
    member.id,
  );
  TestValidator.equals(
    "subscription C member matches member account",
    subscriptionC.member.id,
    member.id,
  );

  // Validate community information in subscriptions
  TestValidator.equals(
    "subscription A community matches Community A",
    subscriptionA.community.id,
    communityA.id,
  );
  TestValidator.equals(
    "subscription B community matches Community B",
    subscriptionB.community.id,
    communityB.id,
  );
  TestValidator.equals(
    "subscription C community matches Community C",
    subscriptionC.community.id,
    communityC.id,
  );

  // Validate subscriber counts have been incremented
  TestValidator.equals(
    "Community A subscriber count should be incremented",
    subscriptionA.community.subscriber_count,
    initialSubscriberCount + 1,
  );
  TestValidator.equals(
    "Community B subscriber count should be incremented",
    subscriptionB.community.subscriber_count,
    initialSubscriberCount + 1,
  );
  TestValidator.equals(
    "Community C subscriber count should be incremented",
    subscriptionC.community.subscriber_count,
    initialSubscriberCount + 1,
  );
}
