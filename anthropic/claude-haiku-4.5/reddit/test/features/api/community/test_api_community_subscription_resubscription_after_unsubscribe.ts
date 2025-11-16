import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_subscription_resubscription_after_unsubscribe(
  connection: api.IConnection,
) {
  // Step 1: Register a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(8);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: "TestPassword123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);
  TestValidator.predicate("member registered successfully", member.id !== null);

  // Step 2: Register an administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      username: adminUsername,
      name: "Test Administrator",
      href: "https://example.com/admin",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);
  TestValidator.predicate(
    "administrator registered successfully",
    admin.id !== null,
  );

  // Step 3: Create a test category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.predicate(
    "category created successfully",
    category.id !== null,
  );

  // Step 4: Create a test community (authenticate as member)
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: "A community for technology discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.predicate(
    "community created successfully",
    community.id !== null,
  );

  // Step 5: Subscribe the member to the community (initial subscription)
  const firstSubscription =
    await api.functional.communityPlatform.member.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(firstSubscription);
  TestValidator.predicate(
    "first subscription created",
    firstSubscription.id !== null,
  );
  const firstSubscriptionId = firstSubscription.id;
  const firstSubscribedAt = firstSubscription.subscribed_at;

  // Step 6: Verify the subscription was created
  TestValidator.equals(
    "subscription member matches",
    firstSubscription.member.id,
    member.id,
  );
  TestValidator.equals(
    "subscription community matches",
    firstSubscription.community.id,
    community.id,
  );

  // Step 7: Unsubscribe the member from the community
  await api.functional.communityPlatform.member.communities.subscriptions.erase(
    connection,
    {
      communityId: community.id,
      subscriptionId: firstSubscription.id,
    },
  );

  // Step 8: Verify unsubscription was successful (subscription should be deleted)
  // The delete operation succeeded, so the subscription is now gone

  // Step 9: Resubscribe the member to the community
  const secondSubscription =
    await api.functional.communityPlatform.member.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(secondSubscription);
  TestValidator.predicate(
    "second subscription created",
    secondSubscription.id !== null,
  );

  // Step 10: Verify the resubscription created a NEW subscription record
  TestValidator.notEquals(
    "new subscription has different ID than first",
    firstSubscriptionId,
    secondSubscription.id,
  );

  TestValidator.notEquals(
    "new subscription has different timestamp",
    firstSubscribedAt,
    secondSubscription.subscribed_at,
  );

  // Step 11: Verify second subscription details
  TestValidator.equals(
    "second subscription member matches",
    secondSubscription.member.id,
    member.id,
  );
  TestValidator.equals(
    "second subscription community matches",
    secondSubscription.community.id,
    community.id,
  );

  // Additional verification: The second subscription should have a more recent timestamp
  TestValidator.predicate(
    "second subscription timestamp is later than first",
    new Date(secondSubscription.subscribed_at) > new Date(firstSubscribedAt),
  );
}
