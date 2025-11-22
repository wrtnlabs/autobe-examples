import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscriptionJunction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscriptionJunction";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_subscription_update_from_digest_to_full(
  connection: api.IConnection,
) {
  // Step 1: Create user account for subscription testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(12),
        email: userEmail,
        password: "TestPassword123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        location: "Seoul, South Korea",
        website_url: typia.random<string & tags.Format<"uri">>(),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        href: "https://example.com/register",
        referrer: "https://google.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Create community for subscription testing
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(8).toLowerCase(),
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
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

  // Step 3: Create initial digest subscription
  const initialSubscription: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        userId: user.id,
        body: {
          subscription_level: "digest",
          notification_enabled: false,
          feed_weight: 0.8,
        } satisfies IRedditPlatformCommunitySubscriptionJunction.ICreate,
      },
    );
  typia.assert(initialSubscription);

  // Step 4: Update subscription from digest to full level
  const updatedSubscription: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.registeredUser.communities.subscriptions.update(
      connection,
      {
        communityName: community.name,
        userId: user.id,
        body: {
          subscription_level: "full",
          notification_enabled: true,
          feed_weight: 1.5,
        } satisfies IRedditPlatformCommunitySubscriptionJunction.IUpdate,
      },
    );
  typia.assert(updatedSubscription);

  // Step 5: Validate subscription update
  TestValidator.equals(
    "subscription ID should remain consistent",
    updatedSubscription.id,
    initialSubscription.id,
  );
  TestValidator.equals(
    "community ID should remain consistent",
    updatedSubscription.reddit_platform_community_id,
    initialSubscription.reddit_platform_community_id,
  );
  TestValidator.equals(
    "user ID should remain consistent",
    updatedSubscription.registered_user_id,
    initialSubscription.registered_user_id,
  );
  TestValidator.equals(
    "subscription level should be upgraded to full",
    updatedSubscription.subscription_level,
    "full",
  );
  TestValidator.equals(
    "notification should be enabled for full subscription",
    updatedSubscription.notification_enabled,
    true,
  );
  TestValidator.equals(
    "feed weight should be increased for full subscription",
    updatedSubscription.feed_weight,
    1.5,
  );
  TestValidator.predicate(
    "subscribed timestamp should be preserved",
    updatedSubscription.subscribed_at !== null &&
      updatedSubscription.subscribed_at !== undefined,
  );
  TestValidator.predicate(
    "last activity timestamp should be updated or preserved",
    updatedSubscription.last_activity_at !== null &&
      updatedSubscription.last_activity_at !== undefined,
  );

  // Step 6: Validate feed weight logic for engagement
  TestValidator.predicate(
    "full subscription should have higher feed weight than digest",
    updatedSubscription.feed_weight > initialSubscription.feed_weight,
  );
  TestValidator.equals(
    "feed weight should be within valid range",
    updatedSubscription.feed_weight >= 0.1 &&
      updatedSubscription.feed_weight <= 2.0,
    true,
  );
}
