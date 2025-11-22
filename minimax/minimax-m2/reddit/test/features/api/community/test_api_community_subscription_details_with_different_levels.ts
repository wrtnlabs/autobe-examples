import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformCommunitySubscriptionJunction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscriptionJunction";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_subscription_details_with_different_levels(
  connection: api.IConnection,
) {
  // Step 1: Create three users with different subscription preferences
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `user1_${RandomGenerator.alphaNumeric(8)}`,
        email: user1Email,
        password: "password123",
        href: "https://example.com/user1",
        referrer: "https://example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user1);

  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `user2_${RandomGenerator.alphaNumeric(8)}`,
        email: user2Email,
        password: "password123",
        href: "https://example.com/user2",
        referrer: "https://example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user2);

  const user3Email = typia.random<string & tags.Format<"email">>();
  const user3: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `user3_${RandomGenerator.alphaNumeric(8)}`,
        email: user3Email,
        password: "password123",
        href: "https://example.com/user3",
        referrer: "https://example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user3);

  // Step 2: Create community
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: `test_community_${RandomGenerator.alphaNumeric(8)}`,
          title: "Test Community for Subscription Levels",
          description: "Community to test different subscription levels",
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

  // Step 3: Create different subscriptions for each user
  // User 1: Full subscription with notifications and standard feed weight
  const user1Subscription: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        userId: user1.id,
        body: {
          subscription_level: "full",
          notification_enabled: true,
          feed_weight: 1.0,
        } satisfies IRedditPlatformCommunitySubscriptionJunction.ICreate,
      },
    );
  typia.assert(user1Subscription);

  // User 2: Digest subscription with notifications disabled and lower feed weight
  const user2Subscription: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        userId: user2.id,
        body: {
          subscription_level: "digest",
          notification_enabled: false,
          feed_weight: 0.5,
        } satisfies IRedditPlatformCommunitySubscriptionJunction.ICreate,
      },
    );
  typia.assert(user2Subscription);

  // User 3: Mute subscription with notifications disabled and high feed weight
  const user3Subscription: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        userId: user3.id,
        body: {
          subscription_level: "mute",
          notification_enabled: false,
          feed_weight: 1.8,
        } satisfies IRedditPlatformCommunitySubscriptionJunction.ICreate,
      },
    );
  typia.assert(user3Subscription);

  // Step 4: Retrieve and validate subscription details for each user
  // Test user 1 - Full subscription with notifications
  const user1Details: IRedditPlatformCommunitySubscription.IInvert =
    await api.functional.redditPlatform.registeredUser.communities.subscriptions.at(
      connection,
      {
        communityName: community.name,
        userId: user1.id,
      },
    );
  typia.assert(user1Details);

  TestValidator.equals(
    "user1 subscription level should be 'full'",
    user1Details.subscription_level,
    "full",
  );
  TestValidator.equals(
    "user1 notifications should be enabled",
    user1Details.notification_enabled,
    true,
  );
  TestValidator.equals(
    "user1 feed weight should be 1.0",
    user1Details.feed_weight,
    1.0,
  );
  TestValidator.equals(
    "user1 community should match",
    user1Details.community.id,
    community.id,
  );

  // Test user 2 - Digest subscription without notifications
  const user2Details: IRedditPlatformCommunitySubscription.IInvert =
    await api.functional.redditPlatform.registeredUser.communities.subscriptions.at(
      connection,
      {
        communityName: community.name,
        userId: user2.id,
      },
    );
  typia.assert(user2Details);

  TestValidator.equals(
    "user2 subscription level should be 'digest'",
    user2Details.subscription_level,
    "digest",
  );
  TestValidator.equals(
    "user2 notifications should be disabled",
    user2Details.notification_enabled,
    false,
  );
  TestValidator.equals(
    "user2 feed weight should be 0.5",
    user2Details.feed_weight,
    0.5,
  );
  TestValidator.equals(
    "user2 community should match",
    user2Details.community.id,
    community.id,
  );

  // Test user 3 - Mute subscription with high feed weight
  const user3Details: IRedditPlatformCommunitySubscription.IInvert =
    await api.functional.redditPlatform.registeredUser.communities.subscriptions.at(
      connection,
      {
        communityName: community.name,
        userId: user3.id,
      },
    );
  typia.assert(user3Details);

  TestValidator.equals(
    "user3 subscription level should be 'mute'",
    user3Details.subscription_level,
    "mute",
  );
  TestValidator.equals(
    "user3 notifications should be disabled",
    user3Details.notification_enabled,
    false,
  );
  TestValidator.equals(
    "user3 feed weight should be 1.8",
    user3Details.feed_weight,
    1.8,
  );
  TestValidator.equals(
    "user3 community should match",
    user3Details.community.id,
    community.id,
  );

  // Additional validation: Ensure all retrieved data includes complete community information
  TestValidator.equals(
    "all users should have same community context",
    user1Details.community.name,
    community.name,
  );
  TestValidator.equals(
    "all users should have same community title",
    user2Details.community.title,
    community.title,
  );
  TestValidator.equals(
    "all users should have same community type",
    user3Details.community.type,
    community.type,
  );
}
