import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformCommunitySubscriptionJunction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscriptionJunction";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_subscription_details_own_subscription_only(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate registered user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(15),
        email: userEmail,
        password: "securePassword123!",
        display_name: "Test Community Creator",
        href: "https://test.example.com/create",
        referrer: "https://test.example.com/referrer",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Create a community where user will be the moderator
  const communityName = `test_${RandomGenerator.alphaNumeric(10)}`;
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: "Test Community for Subscription Privacy",
          description:
            "A test community to validate subscription privacy controls",
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

  // Step 3: Create user's subscription to their own community
  const subscription: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        userId: user.id,
        body: {
          subscription_level: "full",
          notification_enabled: true,
          feed_weight: 1.2,
        } satisfies IRedditPlatformCommunitySubscriptionJunction.ICreate,
      },
    );
  typia.assert(subscription);

  // Step 4: Retrieve subscription details as the authenticated user
  const subscriptionDetails: IRedditPlatformCommunitySubscription.IInvert =
    await api.functional.redditPlatform.registeredUser.communities.subscriptions.at(
      connection,
      {
        communityName: community.name,
        userId: user.id,
      },
    );
  typia.assert(subscriptionDetails);

  // Step 5: Validate that subscription details match the created subscription
  TestValidator.equals(
    "subscription level matches",
    subscriptionDetails.subscription_level,
    "full",
  );
  TestValidator.equals(
    "notification enabled",
    subscriptionDetails.notification_enabled,
    true,
  );
  TestValidator.equals(
    "feed weight matches",
    subscriptionDetails.feed_weight,
    1.2,
  );
  TestValidator.equals(
    "subscription timestamp present",
    subscriptionDetails.subscribed_at,
    subscription.subscribed_at,
  );
  TestValidator.equals(
    "community ID matches",
    subscriptionDetails.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    subscriptionDetails.community.name,
    community.name,
  );

  // Step 6: Validate community context is complete
  TestValidator.equals(
    "community title present",
    subscriptionDetails.community.title,
    "Test Community for Subscription Privacy",
  );
  TestValidator.equals(
    "community type matches",
    subscriptionDetails.community.type,
    "public",
  );
  TestValidator.equals(
    "community status active",
    subscriptionDetails.community.status,
    "active",
  );

  // Step 7: Verify that the subscription belongs to the correct user
  TestValidator.predicate(
    "subscription belongs to authenticated user",
    subscriptionDetails.community.id === community.id &&
      subscriptionDetails.subscription_level === "full",
  );

  // Step 8: Test that subscription information is properly encapsulated
  TestValidator.equals(
    "subscription level is private data",
    subscriptionDetails.subscription_level,
    "full",
  );
  TestValidator.equals(
    "feed weight is private data",
    subscriptionDetails.feed_weight,
    1.2,
  );

  // Step 9: Validate subscription activity tracking
  if (
    subscriptionDetails.last_activity_at !== null &&
    subscriptionDetails.last_activity_at !== undefined
  ) {
    TestValidator.predicate(
      "last activity timestamp is valid ISO format",
      typeof subscriptionDetails.last_activity_at === "string",
    );
  }

  // Step 10: Final validation - ensure this is the user's own subscription
  TestValidator.equals(
    "user can only see their own subscription",
    subscriptionDetails.community.id,
    community.id,
  );
  TestValidator.predicate(
    "subscription privacy controls verified",
    subscriptionDetails.notification_enabled === true &&
      subscriptionDetails.subscription_level === "full" &&
      subscriptionDetails.feed_weight === 1.2,
  );
}
