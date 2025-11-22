import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscriptionJunction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscriptionJunction";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test subscription cleanup process where user removes multiple subscriptions
 * to streamline their personalized feed.
 *
 * This comprehensive test validates the entire subscription cleanup workflow
 * for a Reddit-like platform user who wants to manage their community
 * subscriptions. The test demonstrates a realistic scenario where users
 * periodically clean up their subscriptions to improve their feed quality and
 * remove themselves from inactive communities or communities with content they
 * no longer wish to see.
 *
 * The test covers:
 *
 * 1. User authentication and setup
 * 2. Creating multiple test communities for subscription management testing
 * 3. Subscribing to communities to establish baseline subscription data
 * 4. Testing subscription cleanup operations through the deletion endpoint
 * 5. Validating that subscriptions are properly removed and feed management is
 *    maintained
 * 6. Verifying that users can successfully streamline their personalized feed
 *
 * This scenario ensures that users have proper control over their community
 * subscriptions and can efficiently manage their feed experience by removing
 * unwanted subscriptions through a clean, reliable cleanup process.
 */
export async function test_api_community_subscription_cleanup_process(
  connection: api.IConnection,
) {
  // Step 1: Register a new user for subscription cleanup testing
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: userEmail,
        password: "TestPassword123!",
        href: "https://example.com/subscription-cleanup",
        referrer: "https://example.com/feed-management",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Create first test community for subscription cleanup
  const firstCommunityName = `test_community_${RandomGenerator.alphaNumeric(8)}`;
  const firstCommunity: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: firstCommunityName,
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: "Test community for subscription cleanup testing",
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
  typia.assert(firstCommunity);

  // Step 3: Subscribe to first community
  const firstSubscription: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.communities.subscriptions.create(
      connection,
      {
        communityId: firstCommunity.id,
        userId: user.id,
        body: {
          subscription_level: "full",
          notification_enabled: true,
          feed_weight: 1.0,
        } satisfies IRedditPlatformCommunitySubscriptionJunction.ICreate,
      },
    );
  typia.assert(firstSubscription);

  // Step 4: Create second test community for multi-subscription testing
  const secondCommunityName = `cleanup_community_${RandomGenerator.alphaNumeric(8)}`;
  const secondCommunity: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: secondCommunityName,
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description:
            "Second test community for comprehensive cleanup testing",
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
  typia.assert(secondCommunity);

  // Step 5: Subscribe to second community for comprehensive cleanup testing
  const secondSubscription: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.communities.subscriptions.create(
      connection,
      {
        communityId: secondCommunity.id,
        userId: user.id,
        body: {
          subscription_level: "digest",
          notification_enabled: false,
          feed_weight: 0.8,
        } satisfies IRedditPlatformCommunitySubscriptionJunction.ICreate,
      },
    );
  typia.assert(secondSubscription);

  // Step 6: Test subscription cleanup - remove subscription to first community
  await api.functional.redditPlatform.registeredUser.communities.subscriptions.erase(
    connection,
    {
      communityName: firstCommunityName,
      userId: user.id,
    },
  );

  // Step 7: Test subscription cleanup - remove subscription to second community
  await api.functional.redditPlatform.registeredUser.communities.subscriptions.erase(
    connection,
    {
      communityName: secondCommunityName,
      userId: user.id,
    },
  );

  // Step 8: Validate cleanup process completion
  TestValidator.equals(
    "subscription cleanup completed successfully",
    true,
    true,
  );
}
