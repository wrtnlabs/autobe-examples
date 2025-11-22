import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscriptionJunction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscriptionJunction";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_subscription_custom_preferences(
  connection: api.IConnection,
) {
  // Step 1: Create registered user for testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(10) + "123!";
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(15),
        email: userEmail,
        password: userPassword,
        href: "https://reddit-test.example.com",
        referrer: "https://google.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Create community for subscription with custom settings
  const communityName = `test_community_${RandomGenerator.alphaNumeric(8)}`;
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: `Test Community ${RandomGenerator.name()}`,
          description: `A test community for subscription preferences validation - ${RandomGenerator.paragraph({ sentences: 2 })}`,
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

  // Step 3: Subscribe to community with custom preferences
  const subscription: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.registeredUser.communities.subscriptions.create(
      connection,
      {
        communityName: community.name,
        userId: user.id,
        body: {
          subscription_level: "digest", // Periodic summaries instead of all content
          notification_enabled: false, // No real-time notifications
          feed_weight: 1.8, // High feed weight for elevated content prominence
        } satisfies IRedditPlatformCommunitySubscriptionJunction.ICreate,
      },
    );
  typia.assert(subscription);

  // Step 4: Validate custom subscription preferences
  TestValidator.equals(
    "subscription level is digest",
    subscription.subscription_level,
    "digest",
  );
  TestValidator.predicate(
    "notifications are disabled",
    subscription.notification_enabled === false,
  );
  TestValidator.equals(
    "feed weight is elevated",
    subscription.feed_weight,
    1.8,
  );
  TestValidator.equals(
    "user ID matches",
    subscription.registered_user_id,
    user.id,
  );
  TestValidator.equals(
    "community ID matches",
    subscription.reddit_platform_community_id,
    community.id,
  );

  // Step 5: Verify subscription persistence
  TestValidator.predicate(
    "subscription has creation timestamp",
    subscription.subscribed_at !== null &&
      subscription.subscribed_at !== undefined,
  );
  TestValidator.predicate(
    "subscription ID is valid UUID format",
    /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(
      subscription.id,
    ),
  );
}
