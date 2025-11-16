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
 * Test subscription retrieval confirms active membership in a community.
 *
 * This test validates that members can subscribe to communities and that
 * subscription records can be retrieved to verify active membership status. The
 * subscription endpoint serves as a critical integration point for access
 * control and permission verification in the community platform.
 *
 * Workflow:
 *
 * 1. Create administrator account for category creation
 * 2. Create a category for community classification
 * 3. Create member account for community participation
 * 4. Create community as the authenticated member
 * 5. Subscribe member to the community
 * 6. Retrieve subscription by ID
 * 7. Validate subscription contains correct community and member information
 * 8. Confirm subscription proves active membership status
 */
export async function test_api_subscription_retrieval_membership_verification(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category operations
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(5) + "Aa1!Xx";
  const adminCreateData = {
    email: adminEmail,
    password: adminPassword,
    username: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const adminAccount = await api.functional.auth.administrator.join(
    connection,
    {
      body: adminCreateData,
    },
  );
  typia.assert(adminAccount);

  // Step 2: Create a category for community classification
  const categorySlug = RandomGenerator.alphabets(10).toLowerCase();
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: categorySlug,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      { body: categoryData },
    );
  typia.assert(category);

  // Step 3: Create member account for community participation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(5) + "Bb2!Yy";
  const memberCreateData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(10),
    password: memberPassword,
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const memberAccount = await api.functional.auth.member.join(connection, {
    body: memberCreateData,
  });
  typia.assert(memberAccount);

  // Step 4: Create community as authenticated member
  const communityIdentifier = RandomGenerator.alphabets(8).toLowerCase();
  const communityData = {
    name: RandomGenerator.name(2),
    identifier: communityIdentifier,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityData },
    );
  typia.assert(community);

  // Validate community was created correctly
  TestValidator.equals(
    "community identifier matches",
    community.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "community name matches",
    community.name,
    communityData.name,
  );
  TestValidator.equals(
    "community visibility is public",
    community.visibility,
    "public",
  );

  // Step 5: Subscribe member to the community
  const subscriptionData = {
    community_id: community.id,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription =
    await api.functional.communityPlatform.member.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: subscriptionData,
      },
    );
  typia.assert(subscription);

  // Validate initial subscription
  TestValidator.equals(
    "subscription community ID matches",
    subscription.community.id,
    community.id,
  );
  TestValidator.equals(
    "subscription member ID matches",
    subscription.member.id,
    memberAccount.id,
  );
  TestValidator.predicate(
    "subscription timestamp is not in future",
    () => new Date(subscription.subscribed_at) <= new Date(),
  );

  // Step 6: Retrieve subscription by ID to verify membership status
  const retrievedSubscription =
    await api.functional.communityPlatform.member.communities.subscriptions.at(
      connection,
      {
        communityId: community.id,
        subscriptionId: subscription.id,
      },
    );
  typia.assert(retrievedSubscription);

  // Step 7: Validate retrieved subscription contains correct information
  TestValidator.equals(
    "retrieved subscription ID matches original",
    retrievedSubscription.id,
    subscription.id,
  );
  TestValidator.equals(
    "retrieved community ID matches",
    retrievedSubscription.community.id,
    community.id,
  );
  TestValidator.equals(
    "retrieved community identifier matches",
    retrievedSubscription.community.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "retrieved member ID matches",
    retrievedSubscription.member.id,
    memberAccount.id,
  );
  TestValidator.equals(
    "retrieved subscription timestamp matches",
    retrievedSubscription.subscribed_at,
    subscription.subscribed_at,
  );

  // Step 8: Confirm subscription proves active membership status
  TestValidator.predicate(
    "member is actively subscribed to community",
    () =>
      retrievedSubscription.member.id === memberAccount.id &&
      retrievedSubscription.community.id === community.id,
  );

  TestValidator.predicate(
    "subscription was created before current time",
    () => {
      const subscriptionDate = new Date(retrievedSubscription.subscribed_at);
      const now = new Date();
      return subscriptionDate <= now;
    },
  );

  TestValidator.predicate(
    "community reflects new subscriber",
    () => community.subscriber_count >= 1,
  );
}
