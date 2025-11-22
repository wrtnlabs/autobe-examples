import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Comprehensive community subscription management test for registered users.
 *
 * Tests the complete workflow of a registered user managing their subscription
 * to a community by setting subscription level to 'full', enabling
 * notifications, and configuring optimal feed weight. Validates that
 * subscription preferences are correctly saved and applied to personalized feed
 * generation, ensuring users can customize their community experience through
 * flexible subscription management.
 *
 * The test follows this workflow:
 *
 * 1. Register a new user account for subscription testing
 * 2. Create a community for subscription management testing
 * 3. Update user subscription with full access level, notifications enabled, and
 *    optimal feed weight
 * 4. Validate that subscription preferences are correctly saved and returned
 */
export async function test_api_community_subscription_management_full(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account for testing subscription management
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.name(1).replace(/\s/g, "_").toLowerCase(),
        email: userEmail,
        password: "SecurePassword123!",
        display_name: RandomGenerator.name(),
        bio: "Test user for community subscription testing",
        href: "https://example.com/test",
        referrer: "https://google.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Create a community for subscription testing
  const communityName: string = `test_community_${RandomGenerator.alphaNumeric(8)}`;
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: `Test Community for ${user.username}`,
          description:
            "A test community created for validating subscription management functionality",
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
  TestValidator.equals(
    "community created successfully",
    community.name,
    communityName,
  );

  // Step 3: Update user subscription with full access level, notifications enabled, and optimal feed weight
  const optimalFeedWeight: number &
    tags.Minimum<0.1> &
    tags.Maximum<2> &
    tags.MultipleOf<0.1> = 1.5;
  const subscription: IRedditPlatformCommunitySubscription.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.subscriptions.index(
      connection,
      {
        communityName: community.name,
        body: {
          subscription_level: "full",
          notification_enabled: true,
          feed_weight: optimalFeedWeight,
        } satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(subscription);

  // Step 4: Validate subscription preferences are correctly saved and returned
  TestValidator.equals(
    "subscription level should be full",
    subscription.subscription_level,
    "full",
  );
  TestValidator.predicate(
    "notifications should be enabled",
    subscription.notification_enabled === true,
  );
  TestValidator.equals(
    "feed weight should match configured value",
    subscription.feed_weight,
    optimalFeedWeight,
  );
  TestValidator.equals(
    "community name should match created community",
    subscription.community_name,
    communityName,
  );
  TestValidator.equals(
    "community title should match created community",
    subscription.community_title,
    community.title,
  );

  // Verify timestamp fields are present and valid
  TestValidator.predicate(
    "subscription should have valid timestamp",
    subscription.subscribed_at !== null &&
      subscription.subscribed_at !== undefined &&
      subscription.subscribed_at.length > 0,
  );

  // Validate that feed weight is within acceptable range
  TestValidator.predicate(
    "feed weight should be within valid range",
    subscription.feed_weight >= 0.1 && subscription.feed_weight <= 2.0,
  );
}
