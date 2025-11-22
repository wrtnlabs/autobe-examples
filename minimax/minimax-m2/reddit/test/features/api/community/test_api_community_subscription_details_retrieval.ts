import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformCommunitySubscriptionJunction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscriptionJunction";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test retrieving subscription details for a user in a specific community.
 *
 * This test validates the complete subscription details retrieval workflow:
 *
 * 1. Register a new user account through authentication
 * 2. Create a new community with specific settings and permissions
 * 3. Establish a subscription relationship with custom preferences
 * 4. Retrieve comprehensive subscription details including preferences and
 *    community context
 * 5. Validate that subscription preferences are properly stored and retrieved with
 *    complete community information
 *
 * The test ensures users can effectively manage their community subscriptions
 * with granular control over notification preferences, feed weighting, and
 * subscription levels while maintaining proper data consistency across
 * user-community relationships.
 */
export async function test_api_community_subscription_details_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account for subscription testing
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: userEmail,
        password: "SecurePassword123!",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        location: RandomGenerator.name(1),
        website_url: `https://${RandomGenerator.name(1)}.example.com`,
        avatar_url: `https://avatar.example.com/${RandomGenerator.alphaNumeric(8)}.jpg`,
        href: "https://app.example.com/register",
        referrer: "https://app.example.com/landing",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Create a new community for subscription testing
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(15).toLowerCase(),
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 8,
          }),
          description: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 12,
          }),
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

  // Step 3: Create subscription relationship with custom preferences
  const subscriptionLevel: "full" | "digest" | "mute" = RandomGenerator.pick([
    "full",
    "digest",
    "mute",
  ] as const);
  const notificationEnabled: boolean = RandomGenerator.pick([
    true,
    false,
  ] as const);
  const feedWeight: number = typia.random<
    number & tags.Minimum<0.1> & tags.Maximum<2>
  >();

  const subscription: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        userId: user.id,
        body: {
          subscription_level: subscriptionLevel,
          notification_enabled: notificationEnabled,
          feed_weight: feedWeight,
        } satisfies IRedditPlatformCommunitySubscriptionJunction.ICreate,
      },
    );
  typia.assert(subscription);

  // Step 4: Retrieve subscription details for validation
  const subscriptionDetails: IRedditPlatformCommunitySubscription.IInvert =
    await api.functional.redditPlatform.registeredUser.communities.subscriptions.at(
      connection,
      {
        communityName: community.name,
        userId: user.id,
      },
    );
  typia.assert(subscriptionDetails);

  // Step 5: Validate subscription details against created data
  TestValidator.equals(
    "subscription ID matches created subscription",
    subscriptionDetails.id,
    subscription.id,
  );

  TestValidator.equals(
    "subscription level matches preference",
    subscriptionDetails.subscription_level,
    subscriptionLevel,
  );

  TestValidator.equals(
    "notification preference matches setting",
    subscriptionDetails.notification_enabled,
    notificationEnabled,
  );

  TestValidator.predicate(
    "feed weight is within valid range",
    subscriptionDetails.feed_weight >= 0.1 &&
      subscriptionDetails.feed_weight <= 2.0,
  );

  TestValidator.predicate(
    "subscription timestamp exists and is valid",
    subscriptionDetails.subscribed_at !== null &&
      new Date(subscriptionDetails.subscribed_at).getTime() > 0,
  );

  // Validate community context in subscription details
  TestValidator.equals(
    "community ID matches created community",
    subscriptionDetails.community.id,
    community.id,
  );

  TestValidator.equals(
    "community name matches created community",
    subscriptionDetails.community.name,
    community.name,
  );

  TestValidator.equals(
    "community title matches created community",
    subscriptionDetails.community.title,
    community.title,
  );

  TestValidator.equals(
    "community description matches created community",
    subscriptionDetails.community.description,
    community.description,
  );

  TestValidator.equals(
    "community type matches created community",
    subscriptionDetails.community.type,
    community.type,
  );

  TestValidator.equals(
    "community member count is tracked",
    subscriptionDetails.community.member_count >= 0,
    true,
  );

  TestValidator.equals(
    "community post count is tracked",
    subscriptionDetails.community.post_count >= 0,
    true,
  );

  TestValidator.equals(
    "community subscriber count includes current user",
    subscriptionDetails.community.subscriber_count >= 1,
    true,
  );

  TestValidator.equals(
    "community NSFW policy matches created community",
    subscriptionDetails.community.nsfw_content_allowed,
    community.nsfw_content_allowed,
  );

  // Validate timestamp consistency
  TestValidator.predicate(
    "subscription timestamps are chronologically ordered",
    new Date(subscriptionDetails.subscribed_at).getTime() >=
      new Date(subscription.subscribed_at).getTime(),
  );

  // Test multiple subscription levels for comprehensive validation
  const differentSubscriptionLevel: "full" | "digest" | "mute" = [
    "full",
    "digest",
    "mute",
  ].find((level) => level !== subscriptionLevel) as "full" | "digest" | "mute";

  const secondSubscription: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        userId: user.id,
        body: {
          subscription_level: differentSubscriptionLevel,
          notification_enabled: !notificationEnabled,
          feed_weight: typia.random<
            number & tags.Minimum<0.1> & tags.Maximum<2>
          >(),
        } satisfies IRedditPlatformCommunitySubscriptionJunction.ICreate,
      },
    );
  typia.assert(secondSubscription);

  // Retrieve updated subscription details
  const updatedSubscriptionDetails: IRedditPlatformCommunitySubscription.IInvert =
    await api.functional.redditPlatform.registeredUser.communities.subscriptions.at(
      connection,
      {
        communityName: community.name,
        userId: user.id,
      },
    );
  typia.assert(updatedSubscriptionDetails);

  TestValidator.equals(
    "updated subscription reflects latest changes",
    updatedSubscriptionDetails.subscription_level,
    differentSubscriptionLevel,
  );

  TestValidator.equals(
    "updated notification preference is reflected",
    updatedSubscriptionDetails.notification_enabled,
    !notificationEnabled,
  );
}
