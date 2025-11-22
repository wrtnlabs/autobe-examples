import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscriptionJunction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscriptionJunction";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_subscription_mute_level(
  connection: api.IConnection,
) {
  // Step 1: Create a registered user account for testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `testuser_${RandomGenerator.alphaNumeric(8)}`,
        email: userEmail,
        password: "TestPassword123!",
        display_name: "Test User",
        bio: "Test user for mute subscription testing",
        href: "https://example.com/register",
        referrer: "https://google.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Create a new community for subscription testing
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: `test_community_${RandomGenerator.alphaNumeric(8)}`,
          title: "Test Community for Mute Subscriptions",
          description:
            "A test community to verify mute subscription functionality",
          type: "public",
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: true,
          require_post_approval: false,
          require_comment_approval: false,
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create a muted subscription relationship
  const subscription: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        userId: user.id,
        body: {
          subscription_level: "mute",
          notification_enabled: false,
          feed_weight: 0.1,
        } satisfies IRedditPlatformCommunitySubscriptionJunction.ICreate,
      },
    );
  typia.assert(subscription);

  // Step 4: Validate subscription creation and mute level
  TestValidator.equals(
    "subscription level should be 'mute'",
    subscription.subscription_level,
    "mute",
  );
  TestValidator.equals(
    "notification should be disabled for mute level",
    subscription.notification_enabled,
    false,
  );
  TestValidator.equals(
    "feed weight should be reduced for mute level",
    subscription.feed_weight,
    0.1,
  );

  // Step 5: Verify subscription relationship exists
  TestValidator.equals(
    "subscription relationship should exist",
    subscription.reddit_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "subscription should be linked to correct user",
    subscription.registered_user_id,
    user.id,
  );

  // Step 6: Validate subscription tracking fields
  TestValidator.predicate(
    "subscription should have subscribed timestamp",
    subscription.subscribed_at !== undefined &&
      subscription.subscribed_at !== null,
  );
  TestValidator.equals(
    "last activity should be initially undefined",
    subscription.last_activity_at,
    undefined,
  );

  // Step 7: Verify muted subscription behavior
  TestValidator.predicate(
    "mute level subscription should minimize content visibility",
    subscription.feed_weight < 1.0,
  );
  TestValidator.predicate(
    "mute subscription should disable notifications",
    subscription.notification_enabled === false,
  );
}
