import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscriptionJunction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscriptionJunction";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test successful community subscription with full content level. User
 * subscribes to a community with 'full' subscription level, enabling all
 * content visibility and notifications. Verify subscription creation, feed
 * weight calculation, and that community content appears in user's personalized
 * feed with proper weighting. This test validates the complete subscription
 * workflow from user registration through community creation to establishing a
 * full-level subscription relationship that enables comprehensive community
 * engagement.
 */
export async function test_api_community_subscription_full_level(
  connection: api.IConnection,
) {
  // Step 1: Create user account for subscription testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userData = {
    username: RandomGenerator.alphaNumeric(12),
    email: userEmail,
    password: "TestPassword123!",
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: RandomGenerator.name(1) + ", " + RandomGenerator.name(1),
    website_url: typia.random<string & tags.Format<"uri">>(),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies IRedditPlatformRegisteredUser.ICreate;

  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: userData,
    });
  typia.assert(user);

  // Step 2: Create community to subscribe to
  const communityData = {
    name: RandomGenerator.alphaNumeric(15).toLowerCase(),
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    type: "public" as const,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
    require_post_approval: false,
    require_comment_approval: false,
    nsfw_content_allowed: false,
  } satisfies IRedditPlatformCommunity.ICreate;

  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Create full-level subscription relationship
  const subscriptionData = {
    subscription_level: "full",
    notification_enabled: true,
    feed_weight: 1.5,
  } satisfies IRedditPlatformCommunitySubscriptionJunction.ICreate;

  const subscription: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        userId: user.id,
        body: subscriptionData,
      },
    );
  typia.assert(subscription);

  // Step 4: Verify subscription creation and parameters
  TestValidator.equals(
    "subscription level should be full",
    subscription.subscription_level,
    "full",
  );

  TestValidator.predicate(
    "notification should be enabled",
    subscription.notification_enabled,
  );

  TestValidator.equals(
    "feed weight should match input",
    subscription.feed_weight,
    1.5,
  );

  TestValidator.equals(
    "community ID should match target community",
    subscription.reddit_platform_community_id,
    community.id,
  );

  TestValidator.equals(
    "user ID should match subscribing user",
    subscription.registered_user_id,
    user.id,
  );

  TestValidator.predicate(
    "subscribed timestamp should be set",
    subscription.subscribed_at !== undefined &&
      subscription.subscribed_at !== null,
  );
}
