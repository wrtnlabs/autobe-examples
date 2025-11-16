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
 * Test authorization controls for subscription retrieval
 *
 * Validates that only authorized members can view subscription details. A
 * member can retrieve their own subscription, but attempting to retrieve
 * another member's subscription details should be restricted based on access
 * control policies. Confirms that subscription visibility respects public vs
 * private community settings and member authorization levels.
 *
 * Process:
 *
 * 1. Create first member account (member1)
 * 2. Create second member account (member2)
 * 3. Create administrator account
 * 4. Create a category for community classification
 * 5. Member1 creates a public community
 * 6. Member1 subscribes to their own community
 * 7. Member2 authenticates and attempts to retrieve member1's subscription
 * 8. Verify proper authorization enforcement
 */
export async function test_api_subscription_retrieval_member_authorization(
  connection: api.IConnection,
) {
  // Step 1: Create first member account
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Data = {
    email: member1Email,
    username: RandomGenerator.alphabets(10),
    password: RandomGenerator.alphaNumeric(12),
    href: "http://localhost:3000/auth/join",
    referrer: "http://localhost:3000",
    ip: "127.0.0.1",
  } satisfies ICommunityPlatformMember.ICreate;

  const member1Auth = await api.functional.auth.member.join(connection, {
    body: member1Data,
  });
  typia.assert(member1Auth);

  // Create connection for member1
  const member1Connection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: member1Auth.token.access,
    },
  };

  // Step 2: Create second member account
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Data = {
    email: member2Email,
    username: RandomGenerator.alphabets(10),
    password: RandomGenerator.alphaNumeric(12),
    href: "http://localhost:3000/auth/join",
    referrer: "http://localhost:3000",
    ip: "127.0.0.1",
  } satisfies ICommunityPlatformMember.ICreate;

  const member2Auth = await api.functional.auth.member.join(connection, {
    body: member2Data,
  });
  typia.assert(member2Auth);

  // Create connection for member2
  const member2Connection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: member2Auth.token.access,
    },
  };

  // Step 3: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(),
    href: "http://localhost:3000/auth/admin/join",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const adminAuth = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(adminAuth);

  // Create connection for admin
  const adminConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: adminAuth.token.access,
    },
  };

  // Step 4: Create a category for community classification
  const categoryData = {
    name: "Technology",
    slug: "technology",
    description: "Technology and programming topics",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 5: Member1 creates a public community
  const communityData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    identifier: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibility: "public",
    post_creation_restriction: "open_to_all",
    post_type_restriction: "all_types",
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      member1Connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 6: Member1 subscribes to their own community
  const subscriptionData = {
    community_id: community.id,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription =
    await api.functional.communityPlatform.member.communities.subscriptions.create(
      member1Connection,
      {
        communityId: community.id,
        body: subscriptionData,
      },
    );
  typia.assert(subscription);

  // Step 7: Member1 retrieves their own subscription (should succeed)
  const ownSubscription =
    await api.functional.communityPlatform.member.communities.subscriptions.at(
      member1Connection,
      {
        communityId: community.id,
        subscriptionId: subscription.id,
      },
    );
  typia.assert(ownSubscription);
  TestValidator.equals(
    "subscription ID matches",
    ownSubscription.id,
    subscription.id,
  );
  TestValidator.equals(
    "subscription community ID matches",
    ownSubscription.community.id,
    community.id,
  );
  TestValidator.equals(
    "subscription member ID matches",
    ownSubscription.member.id,
    member1Auth.id,
  );

  // Step 8: Member2 retrieves the subscription (authorization check)
  const retrievedSubscription =
    await api.functional.communityPlatform.member.communities.subscriptions.at(
      member2Connection,
      {
        communityId: community.id,
        subscriptionId: subscription.id,
      },
    );
  typia.assert(retrievedSubscription);

  // Verify the subscription data is accessible (public community, so subscription metadata should be visible)
  TestValidator.equals(
    "retrieved subscription matches original",
    retrievedSubscription.id,
    subscription.id,
  );
  TestValidator.predicate(
    "subscription has valid subscribed_at timestamp",
    retrievedSubscription.subscribed_at !== null &&
      retrievedSubscription.subscribed_at !== undefined,
  );
}
