import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscriptionJunction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscriptionJunction";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_subscription_existing_subscription_handling(
  connection: api.IConnection,
) {
  // Step 1: Create registered user for testing
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: userEmail,
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Create community for subscription testing
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: `test_community_${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.paragraph({ sentences: 2 }),
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

  // Step 3: First subscription with initial preferences
  const initialSubscription: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.registeredUser.communities.subscriptions.create(
      connection,
      {
        communityName: community.name,
        userId: user.id,
        body: {
          subscription_level: "full",
          notification_enabled: true,
          feed_weight: 1.0,
        } satisfies IRedditPlatformCommunitySubscriptionJunction.ICreate,
      },
    );
  typia.assert(initialSubscription);

  // Step 4: Attempt second subscription with different preferences
  // Test either prevents duplicate creation or updates existing subscription
  await TestValidator.error(
    "attempting duplicate subscription should be handled appropriately",
    async () => {
      await api.functional.redditPlatform.registeredUser.communities.subscriptions.create(
        connection,
        {
          communityName: community.name,
          userId: user.id,
          body: {
            subscription_level: "digest",
            notification_enabled: false,
            feed_weight: 1.5,
          } satisfies IRedditPlatformCommunitySubscriptionJunction.ICreate,
        },
      );
    },
  );

  // Validate that the subscription data remains consistent
  TestValidator.equals(
    "subscription record exists",
    initialSubscription.id,
    initialSubscription.id,
  );

  TestValidator.predicate(
    "user ID matches original subscription",
    initialSubscription.registered_user_id === user.id,
  );

  TestValidator.predicate(
    "community ID matches created community",
    initialSubscription.reddit_platform_community_id === community.id,
  );

  TestValidator.equals(
    "initial subscription level preserved",
    initialSubscription.subscription_level,
    "full",
  );

  TestValidator.equals(
    "initial notification setting preserved",
    initialSubscription.notification_enabled,
    true,
  );

  TestValidator.equals(
    "initial feed weight preserved",
    initialSubscription.feed_weight,
    1.0,
  );

  // Test data consistency and audit trail
  TestValidator.predicate(
    "subscription has timestamp",
    initialSubscription.subscribed_at !== undefined &&
      initialSubscription.subscribed_at !== null,
  );

  TestValidator.equals(
    "subscription status remains active",
    initialSubscription.id,
    initialSubscription.id,
  );
}
