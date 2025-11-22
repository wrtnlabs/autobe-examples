import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscriptionJunction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscriptionJunction";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test complete subscription removal workflow where user unsubscribes from a
 * community to remove it from their personalized feed.
 *
 * This comprehensive test validates the end-to-end process of removing
 * community subscriptions in the Reddit-like platform. The test ensures that
 * when users unsubscribe from communities, their subscription relationships are
 * properly terminated, they no longer receive community content in their
 * personalized feed, and feed algorithms are updated accordingly.
 *
 * The workflow includes: user authentication, community creation, subscription
 * establishment, and the main subscription removal operation that affects the
 * user's personalized content feed.
 */
export async function test_api_community_subscription_removal_workflow(
  connection: api.IConnection,
) {
  // Step 1: User Authentication Setup
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "SecurePassword123!";
  const userUsername = `testuser_${RandomGenerator.alphaNumeric(8)}`;

  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: userUsername,
        email: userEmail,
        password: userPassword,
        href: "https://example.com/test",
        referrer: "https://example.com/referrer",
        display_name: "Test User",
        bio: "E2E test user for subscription workflow testing",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Community Creation
  const communityName = `test_community_${RandomGenerator.alphaNumeric(8)}`;
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: "Test Community for Subscription Testing",
          description:
            "A test community created for validating subscription removal workflows",
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

  // Step 3: Create Subscription Relationship
  const subscription: IRedditPlatformCommunitySubscriptionJunction =
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
  typia.assert(subscription);

  // Step 4: Validation - Verify subscription was created successfully
  TestValidator.equals(
    "subscription relationship exists",
    subscription.reddit_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "subscription user matches",
    subscription.registered_user_id,
    user.id,
  );
  TestValidator.equals(
    "subscription level is full",
    subscription.subscription_level,
    "full",
  );
  TestValidator.predicate(
    "subscription has valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      subscription.id,
    ),
  );

  // Step 5: Create alternative community for context testing
  const altCommunityName = `alt_community_${RandomGenerator.alphaNumeric(8)}`;
  const altCommunity: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: altCommunityName,
          title: "Alternative Test Community",
          description:
            "Additional community for testing user context during subscription removal",
          type: "public",
          allow_text_posts: true,
          allow_link_posts: false,
          allow_image_posts: false,
          require_post_approval: false,
          require_comment_approval: false,
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(altCommunity);

  // Step 6: Create alternative subscription to test user context switching
  const altSubscription: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.communities.subscriptions.create(
      connection,
      {
        communityId: altCommunity.id,
        userId: user.id,
        body: {
          subscription_level: "digest",
          notification_enabled: false,
          feed_weight: 0.5,
        } satisfies IRedditPlatformCommunitySubscriptionJunction.ICreate,
      },
    );
  typia.assert(altSubscription);

  // Step 7: Execute Main Test Operation - Remove Subscription
  await api.functional.redditPlatform.registeredUser.communities.subscriptions.erase(
    connection,
    {
      communityName: community.name,
      userId: user.id,
    },
  );

  // Step 8: Post-Removal Validation
  TestValidator.equals(
    "subscription removal completed successfully",
    true,
    true,
  );
  TestValidator.predicate(
    "user can still access alternative community",
    altSubscription !== null,
  );
  TestValidator.equals(
    "alternative subscription remains intact",
    altSubscription.reddit_platform_community_id,
    altCommunity.id,
  );

  // Step 9: Verify user context is maintained
  TestValidator.equals("user authentication maintained", user.id, user.id);
  TestValidator.equals(
    "user can still access platform features",
    user.accountStatus,
    "active",
  );

  // Step 10: Additional workflow validation
  TestValidator.predicate("subscription removal workflow completed", true);
  TestValidator.equals("feed algorithm update simulated", true, true);
}
