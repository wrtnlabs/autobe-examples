import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscriptionJunction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscriptionJunction";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test community subscription with digest content level functionality.
 *
 * This E2E test validates the complete workflow of creating a user account,
 * establishing a community, and subscribing with digest-level settings that
 * provide periodic summaries instead of real-time notifications. The test
 * verifies that digest subscriptions maintain proper feed integration while
 * controlling content visibility and notification frequency.
 *
 * Test Flow:
 *
 * 1. Register new user account for authentication
 * 2. Create community for subscription testing
 * 3. Create digest-level subscription relationship
 * 4. Validate subscription configuration and response
 *
 * Business Context: Users can customize their community experience through
 * different subscription levels. The 'digest' level is designed for users who
 * want to stay informed without being overwhelmed by real-time updates.
 */
export async function test_api_community_subscription_digest_level(
  connection: api.IConnection,
) {
  // Step 1: Register user account for digest subscription testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: userEmail,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(2),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Create community for digest subscription testing
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
          description: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 8,
            sentenceMax: 15,
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

  // Step 3: Create digest-level subscription with reduced content visibility
  const subscription: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        userId: user.id,
        body: {
          subscription_level: "digest",
          notification_enabled: false,
          feed_weight: 0.5,
        } satisfies IRedditPlatformCommunitySubscriptionJunction.ICreate,
      },
    );
  typia.assert(subscription);

  // Step 4: Validate digest subscription configuration
  TestValidator.equals(
    "digest subscription level",
    subscription.subscription_level,
    "digest",
  );
  TestValidator.equals(
    "digest notifications disabled",
    subscription.notification_enabled,
    false,
  );
  TestValidator.equals("reduced feed weight", subscription.feed_weight, 0.5);
  TestValidator.equals(
    "community ID matches",
    subscription.reddit_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "user ID matches",
    subscription.registered_user_id,
    user.id,
  );
  TestValidator.predicate(
    "subscription has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      subscription.id,
    ),
  );
  TestValidator.predicate(
    "subscription has timestamp",
    subscription.subscribed_at !== null &&
      subscription.subscribed_at !== undefined,
  );
}
