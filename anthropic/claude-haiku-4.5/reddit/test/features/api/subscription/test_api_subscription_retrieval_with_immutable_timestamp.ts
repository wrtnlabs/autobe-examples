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
 * Test that subscription timestamp is immutable after creation.
 *
 * Retrieve a subscription record and verify that the subscribed_at timestamp
 * remains consistent with the original subscription creation time. This
 * validates that the timestamp correctly captures when the member joined the
 * community and cannot be modified through updates. Confirms immutability is
 * enforced at the database level.
 *
 * Test workflow:
 *
 * 1. Create an administrator account for category management
 * 2. Create a category for community classification
 * 3. Create a member account for community creation and subscription
 * 4. Create a community using the member account
 * 5. Create a subscription to the community (sets subscribed_at timestamp)
 * 6. Retrieve the subscription using the subscription ID
 * 7. Verify subscribed_at timestamp is immutable and consistent
 */
export async function test_api_subscription_retrieval_with_immutable_timestamp(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category management
  const adminEmail = RandomGenerator.alphabets(8) + "@admin.test";
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(8) + "Aa1!",
        username: RandomGenerator.alphabets(12),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create a category for community classification
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for community creation and subscription
  const memberEmail = RandomGenerator.alphabets(8) + "@member.test";
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(15),
        password: RandomGenerator.alphabets(8) + "Aa1!",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a community using the member account
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(3),
          identifier: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create a subscription to the community (sets subscribed_at timestamp)
  const createdSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.member.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(createdSubscription);

  // Capture the original subscribed_at timestamp
  const originalSubscribedAt = createdSubscription.subscribed_at;

  // Step 6: Retrieve the subscription using the subscription ID
  const retrievedSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.member.communities.subscriptions.at(
      connection,
      {
        communityId: community.id,
        subscriptionId: createdSubscription.id,
      },
    );
  typia.assert(retrievedSubscription);

  // Step 7: Verify subscribed_at timestamp is immutable and consistent
  TestValidator.equals(
    "subscription subscribed_at timestamp is immutable",
    retrievedSubscription.subscribed_at,
    originalSubscribedAt,
  );

  TestValidator.equals(
    "subscription ID matches",
    retrievedSubscription.id,
    createdSubscription.id,
  );

  TestValidator.equals(
    "subscription community matches",
    retrievedSubscription.community.id,
    community.id,
  );

  TestValidator.equals(
    "subscription member matches",
    retrievedSubscription.member.id,
    member.id,
  );

  TestValidator.predicate(
    "subscribed_at timestamp is valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(
      retrievedSubscription.subscribed_at,
    ),
  );
}
