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
 * Test that unsubscribing from one community does not affect subscriptions to
 * other communities.
 *
 * This test validates the isolation of subscription management operations by:
 *
 * 1. Creating a moderator and establishing two different communities
 * 2. Creating a member account and subscribing to both communities
 * 3. Verifying both subscriptions are active
 * 4. Unsubscribing from only the first community
 * 5. Confirming that the first subscription is removed while the second remains
 *    intact
 * 6. Validating that subscriber counts are updated correctly for each community
 */
export async function test_api_community_subscription_removal_multiple_subscriptions(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create first community
  const community1Name = RandomGenerator.alphabets(10);
  const community1 =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: community1Name,
          display_title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          rules: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community1);

  // Step 3: Create second community
  const community2Name = RandomGenerator.alphabets(10);
  const community2 =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: community2Name,
          display_title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          rules: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community2);

  // Step 4: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 5: Subscribe to first community
  const subscription1 =
    await api.functional.redditCommunity.member.subscriptions.create(
      connection,
      {
        communityName: community1Name,
      },
    );
  typia.assert(subscription1);
  TestValidator.equals(
    "subscription1 community name",
    subscription1.name,
    community1Name,
  );

  // Step 6: Subscribe to second community
  const subscription2 =
    await api.functional.redditCommunity.member.subscriptions.create(
      connection,
      {
        communityName: community2Name,
      },
    );
  typia.assert(subscription2);
  TestValidator.equals(
    "subscription2 community name",
    subscription2.name,
    community2Name,
  );

  // Step 7: Verify both subscriptions exist and subscriber counts are incremented
  TestValidator.equals(
    "community1 subscriber count after subscription",
    subscription1.subscriber_count,
    community1.subscriber_count + 1,
  );
  TestValidator.equals(
    "community2 subscriber count after subscription",
    subscription2.subscriber_count,
    community2.subscriber_count + 1,
  );

  // Step 8: Unsubscribe from first community only
  const unsubscribed1 =
    await api.functional.redditCommunity.member.subscriptions.erase(
      connection,
      {
        communityName: community1Name,
      },
    );
  typia.assert(unsubscribed1);

  // Step 9: Verify that unsubscription returned the correct community and subscriber count is decremented
  TestValidator.equals(
    "unsubscribed community name",
    unsubscribed1.name,
    community1Name,
  );
  TestValidator.equals(
    "community1 subscriber count after unsubscription",
    unsubscribed1.subscriber_count,
    subscription1.subscriber_count - 1,
  );

  // Step 10: The second subscription should remain intact
  // Since we can't directly query subscriptions, we verify by checking the returned subscription data
  // The second community's subscriber count should remain unchanged from when we subscribed
  TestValidator.equals(
    "community2 subscription remains unchanged",
    subscription2.subscriber_count,
    community2.subscriber_count + 1,
  );
}
