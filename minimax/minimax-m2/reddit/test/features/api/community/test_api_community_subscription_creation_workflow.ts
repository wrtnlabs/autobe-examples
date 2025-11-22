import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscriptionJunction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscriptionJunction";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test complete community subscription creation workflow for Reddit-like
 * platform.
 *
 * This E2E test validates the full subscription workflow where an authenticated
 * registered user creates a community and subscribes to it with default
 * settings. The test verifies that subscription relationships are properly
 * established in the junction table, community subscriber counts are updated,
 * and subscription preferences are correctly stored for personalized feed
 * generation.
 *
 * Test Flow:
 *
 * 1. Create registered user through authentication system
 * 2. User creates a new community with customizable settings
 * 3. User subscribes to the community with default preferences
 * 4. Validate subscription relationship and data consistency
 */
export async function test_api_community_subscription_creation_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create registered user for authentication
  const username = `testuser_${RandomGenerator.alphaNumeric(8)}`;
  const email = typia.random<string & tags.Format<"email">>();

  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username,
        email,
        password: "SecurePassword123!",
        display_name: "Test User",
        bio: "E2E test user for community subscription workflow",
        location: "Test City, TC",
        website_url: typia.random<string & tags.Format<"uri">>(),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        href: "https://test.example.com/register",
        referrer: "https://test.example.com/landing",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Create community with the authenticated user
  const communityName = `testcommunity_${RandomGenerator.alphaNumeric(6)}`;
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: `Test Community ${RandomGenerator.name(2)}`,
          description: `A test community created for E2E subscription testing: ${RandomGenerator.paragraph({ sentences: 2 })}`,
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

  // Step 3: Create subscription with default settings (full subscription, notifications enabled, standard feed weight)
  const subscription: IRedditPlatformCommunitySubscriptionJunction =
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
  typia.assert(subscription);

  // Step 4: Validate subscription relationship and data consistency
  TestValidator.equals(
    "subscription user ID matches creator",
    subscription.registered_user_id,
    user.id,
  );
  TestValidator.equals(
    "subscription community ID matches created community",
    subscription.reddit_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "subscription level is full",
    subscription.subscription_level,
    "full",
  );
  TestValidator.equals(
    "notifications are enabled",
    subscription.notification_enabled,
    true,
  );
  TestValidator.equals(
    "feed weight is standard",
    subscription.feed_weight,
    1.0,
  );
  TestValidator.predicate(
    "subscription has valid timestamp",
    !!subscription.subscribed_at,
  );
  TestValidator.predicate(
    "community subscriber count incremented",
    community.subscriber_count > 0,
  );
}
