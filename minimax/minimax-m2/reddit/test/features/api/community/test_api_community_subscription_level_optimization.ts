import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscriptionJunction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscriptionJunction";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_subscription_level_optimization(
  connection: api.IConnection,
) {
  // 1. Register authenticated user for subscription management testing
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const registeredUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(12),
        email: userEmail,
        password: "SecurePass123!",
        href: "https://example.com/register",
        referrer: "https://google.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(registeredUser);

  // 2. Create test community for subscription configuration testing
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: `test_community_${RandomGenerator.alphabets(8)}`,
          title: "Subscription Optimization Test Community",
          description:
            "Community for testing subscription level optimization features",
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

  // 3. Initialize subscription with full access and default settings
  const initialSubscription: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        userId: registeredUser.id,
        body: {
          subscription_level: "full",
          notification_enabled: true,
          feed_weight: 1.0,
        } satisfies IRedditPlatformCommunitySubscriptionJunction.ICreate,
      },
    );
  typia.assert(initialSubscription);

  // Verify initial subscription state
  TestValidator.equals(
    "initial subscription level should be full",
    initialSubscription.subscription_level,
    "full",
  );
  TestValidator.equals(
    "initial notifications should be enabled",
    initialSubscription.notification_enabled,
    true,
  );
  TestValidator.equals(
    "initial feed weight should be 1.0",
    initialSubscription.feed_weight,
    1.0,
  );

  // 4. Optimize subscription settings to reduce content overload
  const optimizedSubscription: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.communities.subscriptions.update(
      connection,
      {
        communityId: community.id,
        userId: registeredUser.id,
        body: {
          subscription_level: "digest",
          notification_enabled: false,
          feed_weight: 0.3,
        } satisfies IRedditPlatformCommunitySubscriptionJunction.IUpdate,
      },
    );
  typia.assert(optimizedSubscription);

  // 5. Validate optimization changes
  TestValidator.equals(
    "subscription level should change to digest",
    optimizedSubscription.subscription_level,
    "digest",
  );
  TestValidator.equals(
    "notifications should be disabled",
    optimizedSubscription.notification_enabled,
    false,
  );
  TestValidator.equals(
    "feed weight should be reduced to minimize content",
    optimizedSubscription.feed_weight,
    0.3,
  );
  TestValidator.equals(
    "subscription relationship should persist",
    optimizedSubscription.reddit_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "user association should remain consistent",
    optimizedSubscription.registered_user_id,
    registeredUser.id,
  );

  // 6. Test feed weight constraint validation
  await TestValidator.error(
    "feed weight should not exceed maximum limit",
    async () => {
      await api.functional.redditPlatform.communities.subscriptions.update(
        connection,
        {
          communityId: community.id,
          userId: registeredUser.id,
          body: {
            feed_weight: 3.0, // Exceeds maximum of 2.0
          } satisfies IRedditPlatformCommunitySubscriptionJunction.IUpdate,
        },
      );
    },
  );

  await TestValidator.error(
    "feed weight should not be below minimum limit",
    async () => {
      await api.functional.redditPlatform.communities.subscriptions.update(
        connection,
        {
          communityId: community.id,
          userId: registeredUser.id,
          body: {
            feed_weight: 0.05, // Below minimum of 0.1
          } satisfies IRedditPlatformCommunitySubscriptionJunction.IUpdate,
        },
      );
    },
  );

  // 7. Test partial update capabilities
  const partialUpdate: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.communities.subscriptions.update(
      connection,
      {
        communityId: community.id,
        userId: registeredUser.id,
        body: {
          feed_weight: 0.5, // Only update feed weight
        } satisfies IRedditPlatformCommunitySubscriptionJunction.IUpdate,
      },
    );
  typia.assert(partialUpdate);

  TestValidator.equals(
    "subscription level should remain digest",
    partialUpdate.subscription_level,
    "digest",
  );
  TestValidator.equals(
    "notifications should remain disabled",
    partialUpdate.notification_enabled,
    false,
  );
  TestValidator.equals(
    "feed weight should be updated to 0.5",
    partialUpdate.feed_weight,
    0.5,
  );
}
