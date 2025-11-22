import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscriptionJunction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscriptionJunction";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_subscription_preference_update(
  connection: api.IConnection,
) {
  // Step 1: User Authentication - Register a new user
  const userEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const userPassword: string = RandomGenerator.alphabets(10) + "123";

  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: userEmail,
        password: userPassword,
        href: "https://example.com/register",
        referrer: "https://example.com/welcome",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Community Creation - Create a test community
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: `test_community_${RandomGenerator.alphaNumeric(6)}`,
          title: "Test Community for Subscription Testing",
          description:
            "A test community created for validating subscription preference management functionality",
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

  // Step 3: Initial Subscription Setup - Create subscription with full access
  const initialSubscription: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        userId: user.id,
        body: {
          subscription_level: "full",
          notification_enabled: true,
          feed_weight: 1.0,
        } satisfies IRedditPlatformCommunitySubscriptionJunction.ICreate,
      },
    );
  typia.assert(initialSubscription);

  TestValidator.equals(
    "initial subscription level should be full",
    initialSubscription.subscription_level,
    "full",
  );
  TestValidator.equals(
    "initial notifications should be enabled",
    initialSubscription.notification_enabled,
    true,
  );
  TestValidator.equals(
    "initial feed weight should be 1.0",
    initialSubscription.feed_weight,
    1.0,
  );

  // Step 4: Subscription Preference Update - Modify preferences
  const updatedSubscription: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.communities.subscriptions.update(
      connection,
      {
        communityId: community.id,
        userId: user.id,
        body: {
          subscription_level: "digest",
          notification_enabled: false,
          feed_weight: 0.7,
        } satisfies IRedditPlatformCommunitySubscriptionJunction.IUpdate,
      },
    );
  typia.assert(updatedSubscription);

  // Step 5: Preference Validation - Verify modifications are saved
  TestValidator.equals(
    "updated subscription level should be digest",
    updatedSubscription.subscription_level,
    "digest",
  );
  TestValidator.equals(
    "updated notifications should be disabled",
    updatedSubscription.notification_enabled,
    false,
  );
  TestValidator.equals(
    "updated feed weight should be 0.7",
    updatedSubscription.feed_weight,
    0.7,
  );
  TestValidator.notEquals(
    "subscription ID should remain the same",
    updatedSubscription.id,
    initialSubscription.id,
  );
  TestValidator.equals(
    "community ID should remain the same",
    updatedSubscription.reddit_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "user ID should remain the same",
    updatedSubscription.registered_user_id,
    user.id,
  );
  TestValidator.predicate(
    "subscribed_at should be preserved",
    new Date(updatedSubscription.subscribed_at) <= new Date(),
  );

  TestValidator.predicate(
    "digest subscription should reduce content frequency",
    updatedSubscription.feed_weight < 1.0,
  );
  TestValidator.predicate(
    "notification disabled should optimize user experience",
    !updatedSubscription.notification_enabled,
  );
  TestValidator.predicate(
    "subscription preference update should be immediate",
    updatedSubscription.subscription_level === "digest",
  );
}
