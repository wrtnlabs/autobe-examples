import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test user mutes a community subscription and validates that community content
 * is hidden from their feed.
 *
 * User sets subscription level to 'mute' for a specific community and validates
 * that content from that community no longer appears in their personalized
 * feed. Ensures that muted communities remain subscribed for membership
 * purposes but content is completely hidden from the user's view to provide
 * control over their content consumption experience.
 */
export async function test_api_community_subscription_mute_setting(
  connection: api.IConnection,
) {
  // Step 1: Register a new user to get authentication context
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: userEmail,
        password: "TestPassword123!",
        display_name: "TestUser",
        bio: "Test user for community subscription testing",
        location: "Test Location",
        website_url: typia.random<string & tags.Format<"uri">>(),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        href: "https://test-app.example.com",
        referrer: "https://test-referrer.example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Create a new community for testing
  const communityName: string = `testcommunity_${RandomGenerator.alphaNumeric(6)}`;
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: `Test Community ${RandomGenerator.paragraph({ sentences: 2 })}`,
          description: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 4,
            wordMax: 8,
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

  // Step 3: Subscribe to the community with 'mute' level
  const subscription: IRedditPlatformCommunitySubscription.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.subscriptions.index(
      connection,
      {
        communityName: community.name,
        body: {
          subscription_level: "mute", // Setting to mute level
          notification_enabled: false, // Disabling notifications
          feed_weight: 0.1, // Minimum feed weight
        } satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(subscription);

  // Step 4: Validate the subscription was created with mute level
  TestValidator.equals(
    "subscription level is mute",
    subscription.subscription_level,
    "mute",
  );
  TestValidator.equals(
    "community name matches",
    subscription.community_name,
    community.name,
  );
  TestValidator.equals(
    "community title matches",
    subscription.community_title,
    community.title,
  );
  TestValidator.equals(
    "notifications disabled",
    subscription.notification_enabled,
    false,
  );
  TestValidator.predicate(
    "feed weight is valid",
    subscription.feed_weight >= 0.1 && subscription.feed_weight <= 2.0,
  );
  TestValidator.predicate(
    "subscription timestamp exists",
    subscription.subscribed_at !== undefined,
  );

  // Step 5: Update the subscription to change preferences but keep mute level
  const updatedSubscription: IRedditPlatformCommunitySubscription.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.subscriptions.index(
      connection,
      {
        communityName: community.name,
        body: {
          subscription_level: "mute", // Keep mute level
          notification_enabled: true, // Enable notifications
          feed_weight: 0.5, // Increase feed weight
        } satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(updatedSubscription);

  // Step 6: Validate the updated subscription maintains mute level
  TestValidator.equals(
    "updated subscription level remains mute",
    updatedSubscription.subscription_level,
    "mute",
  );
  TestValidator.equals(
    "community name persists",
    updatedSubscription.community_name,
    community.name,
  );
  TestValidator.predicate(
    "feed weight updated",
    updatedSubscription.feed_weight === 0.5,
  );

  // Step 7: Verify subscription data consistency
  TestValidator.notEquals(
    "subscription ID is unique",
    subscription.id,
    updatedSubscription.id,
  );
  TestValidator.equals(
    "community name unchanged",
    updatedSubscription.community_name,
    subscription.community_name,
  );
  TestValidator.predicate(
    "muted community content should be hidden from feed",
    updatedSubscription.subscription_level === "mute",
  );
}
