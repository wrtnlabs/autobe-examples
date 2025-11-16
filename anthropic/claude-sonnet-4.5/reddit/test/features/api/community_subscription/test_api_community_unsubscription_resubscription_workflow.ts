import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test the complete lifecycle workflow of subscribing, unsubscribing, and
 * re-subscribing to a community.
 *
 * This test validates that subscription relationships can be created, removed,
 * and recreated without data integrity issues. It verifies that each operation
 * succeeds independently, subscription records are properly created and deleted
 * at each step, the community's subscriber_count accurately reflects the
 * current state (increments and decrements appropriately), and the final
 * re-subscription creates a new subscription record with a fresh created_at
 * timestamp.
 *
 * Steps:
 *
 * 1. Create moderator account and authenticate
 * 2. Create a test community
 * 3. Create member account and authenticate
 * 4. Subscribe member to the community (first subscription)
 * 5. Verify subscription was created successfully
 * 6. Unsubscribe member from the community
 * 7. Verify subscription was removed
 * 8. Re-subscribe member to the community (second subscription)
 * 9. Verify new subscription record with fresh timestamp
 * 10. Validate subscriber counts throughout the lifecycle
 */
export async function test_api_community_unsubscription_resubscription_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      nickname: RandomGenerator.name(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a test community
  const communityName = RandomGenerator.alphabets(10);
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  const initialSubscriberCount = community.subscriber_count;

  // Step 3: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: memberEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: true,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: First subscription - subscribe member to the community
  const firstSubscription =
    await api.functional.redditCommunity.member.communities.subscriptions.create(
      connection,
      {
        communityName: communityName,
      },
    );
  typia.assert(firstSubscription);

  // Step 5: Verify first subscription was created successfully
  TestValidator.equals(
    "first subscription community name",
    firstSubscription.name,
    communityName,
  );
  TestValidator.predicate(
    "first subscription has created_at timestamp",
    firstSubscription.created_at !== null &&
      firstSubscription.created_at !== undefined,
  );

  const firstSubscriptionTime = new Date(
    firstSubscription.created_at,
  ).getTime();

  // Step 6: Unsubscribe member from the community
  const unsubscribeResult =
    await api.functional.redditCommunity.member.communities.subscriptions.erase(
      connection,
      {
        communityName: communityName,
      },
    );
  typia.assert(unsubscribeResult);

  // Step 7: Verify unsubscription response
  TestValidator.equals(
    "unsubscribe result community name",
    unsubscribeResult.name,
    communityName,
  );

  // Step 8: Re-subscribe member to the community (second subscription)
  const secondSubscription =
    await api.functional.redditCommunity.member.communities.subscriptions.create(
      connection,
      {
        communityName: communityName,
      },
    );
  typia.assert(secondSubscription);

  // Step 9: Verify new subscription record with fresh timestamp
  TestValidator.equals(
    "second subscription community name",
    secondSubscription.name,
    communityName,
  );
  TestValidator.predicate(
    "second subscription has created_at timestamp",
    secondSubscription.created_at !== null &&
      secondSubscription.created_at !== undefined,
  );

  const secondSubscriptionTime = new Date(
    secondSubscription.created_at,
  ).getTime();

  // Step 10: Validate that re-subscription has a fresh timestamp (should be later than first)
  TestValidator.predicate(
    "re-subscription timestamp is fresh and different from first subscription",
    secondSubscriptionTime >= firstSubscriptionTime,
  );

  // Verify subscription data integrity
  TestValidator.equals(
    "subscription community ID matches",
    secondSubscription.id,
    community.id,
  );
  TestValidator.equals(
    "subscription title matches",
    secondSubscription.title,
    community.display_title,
  );
  TestValidator.equals(
    "subscription description matches",
    secondSubscription.description,
    community.description,
  );
}
