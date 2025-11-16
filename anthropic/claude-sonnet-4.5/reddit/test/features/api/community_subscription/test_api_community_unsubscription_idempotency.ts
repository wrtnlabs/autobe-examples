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
 * Test idempotent unsubscription behavior when no active subscription exists.
 *
 * This test validates that the system handles gracefully when a member attempts
 * to unsubscribe from a community they are not currently subscribed to. This
 * scenario can occur when users click unsubscribe multiple times or attempt to
 * unsubscribe from communities they never joined.
 *
 * Test Flow:
 *
 * 1. Create moderator account and authenticate
 * 2. Create a test community
 * 3. Create member account and authenticate
 * 4. Attempt unsubscription without prior subscription
 * 5. Verify graceful handling (either success or appropriate error)
 */
export async function test_api_community_unsubscription_idempotency(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for community creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://test.example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://test.example.com" satisfies string &
        tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a community for unsubscription testing
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
          icon_url: typia.random<(string & tags.Format<"uri">) | null>(),
          banner_url: typia.random<(string & tags.Format<"uri">) | null>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account to test unsubscription
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<(string & tags.Format<"uri">) | null>(),
      show_online_status: typia.random<boolean>(),
      show_subscribed_communities: typia.random<boolean>(),
      show_activity_feed: typia.random<boolean>(),
      ip: "127.0.0.1",
      href: "https://test.example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://test.example.com" satisfies string &
        tags.Format<"uri">,
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Attempt to unsubscribe from community without prior subscription
  // This is the core of the idempotency test - no subscription was created
  const result =
    await api.functional.redditCommunity.member.communities.subscriptions.erase(
      connection,
      {
        communityName: community.name,
      },
    );
  typia.assert(result);

  // Step 5: Verify the operation completed successfully
  // The system handles the edge case gracefully by returning a subscription object
  // This demonstrates idempotent behavior - unsubscribing when not subscribed succeeds
  TestValidator.equals(
    "unsubscribe operation returns community subscription data",
    result.name,
    community.name,
  );
}
