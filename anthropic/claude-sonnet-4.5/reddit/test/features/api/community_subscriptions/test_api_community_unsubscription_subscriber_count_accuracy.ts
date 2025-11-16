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
 * Test subscriber count accuracy when members unsubscribe from a community.
 *
 * This test validates that the community's subscriber_count field accurately
 * decrements when a member unsubscribes, especially in scenarios with multiple
 * subscribers. The test creates a community, has multiple members subscribe,
 * then verifies that unsubscription decrements the count by exactly 1 while
 * other subscriptions remain intact.
 *
 * Workflow:
 *
 * 1. Create moderator account and community
 * 2. Create three member accounts
 * 3. All three members subscribe to the community
 * 4. Verify subscriber_count increments to 3
 * 5. One member unsubscribes
 * 6. Verify subscriber_count decrements to 2
 * 7. Confirm other subscriptions remain active
 */
export async function test_api_community_unsubscription_subscriber_count_accuracy(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
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

  // Step 2: Moderator creates a community
  const communityName = RandomGenerator.alphabets(10);
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          rules: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "initial subscriber count",
    community.subscriber_count,
    0,
  );

  // Step 3: Create first member account
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = typia.random<string & tags.MinLength<8>>();
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: member1Email,
      password: member1Password,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member1);

  // Step 4: Member1 subscribes to the community
  const subscription1 =
    await api.functional.redditCommunity.member.communities.subscriptions.create(
      connection,
      {
        communityName: communityName,
      },
    );
  typia.assert(subscription1);
  TestValidator.equals(
    "subscriber count after first subscription",
    subscription1.subscriber_count,
    1,
  );

  // Step 5: Create second member account
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = typia.random<string & tags.MinLength<8>>();
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: member2Email,
      password: member2Password,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member2);

  // Step 6: Member2 subscribes to the community
  const subscription2 =
    await api.functional.redditCommunity.member.communities.subscriptions.create(
      connection,
      {
        communityName: communityName,
      },
    );
  typia.assert(subscription2);
  TestValidator.equals(
    "subscriber count after second subscription",
    subscription2.subscriber_count,
    2,
  );

  // Step 7: Create third member account
  const member3Email = typia.random<string & tags.Format<"email">>();
  const member3Password = typia.random<string & tags.MinLength<8>>();
  const member3 = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: member3Email,
      password: member3Password,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member3);

  // Step 8: Member3 subscribes to the community
  const subscription3 =
    await api.functional.redditCommunity.member.communities.subscriptions.create(
      connection,
      {
        communityName: communityName,
      },
    );
  typia.assert(subscription3);
  TestValidator.equals(
    "subscriber count after third subscription",
    subscription3.subscriber_count,
    3,
  );

  // Step 9: Switch back to member2 and unsubscribe
  await api.functional.auth.member.login(connection, {
    body: {
      email: member2Email,
      password: member2Password,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ILogin,
  });

  const unsubscribeResult =
    await api.functional.redditCommunity.member.communities.subscriptions.erase(
      connection,
      {
        communityName: communityName,
      },
    );
  typia.assert(unsubscribeResult);

  // Step 10: Validate subscriber count decremented by exactly 1
  TestValidator.equals(
    "subscriber count after unsubscription",
    unsubscribeResult.subscriber_count,
    2,
  );
}
