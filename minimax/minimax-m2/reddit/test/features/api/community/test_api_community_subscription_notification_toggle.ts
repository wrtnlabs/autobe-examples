import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_subscription_notification_toggle(
  connection: api.IConnection,
) {
  // 1. Register a user for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: userEmail,
        password: "password123",
        href: "https://example.com",
        referrer: "https://google.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // 2. Create a community for notification testing
  const communityName = `test-${RandomGenerator.alphaNumeric(6)}`;
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: "Test Community for Notifications",
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

  // 3. Initial subscription - disable notifications
  const initialSubscription: IRedditPlatformCommunitySubscription.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.subscriptions.index(
      connection,
      {
        communityName: communityName,
        body: {
          subscription_level: "full",
          notification_enabled: false,
          feed_weight: 1.0,
        } satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(initialSubscription);
  TestValidator.equals(
    "notifications initially disabled",
    initialSubscription.notification_enabled,
    false,
  );

  // 4. Enable notifications
  const enabledSubscription: IRedditPlatformCommunitySubscription.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.subscriptions.index(
      connection,
      {
        communityName: communityName,
        body: {
          subscription_level: "full",
          notification_enabled: true,
          feed_weight: 1.0,
        } satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(enabledSubscription);
  TestValidator.equals(
    "notifications enabled successfully",
    enabledSubscription.notification_enabled,
    true,
  );

  // 5. Verify subscription details are maintained
  TestValidator.equals(
    "subscription level maintained",
    enabledSubscription.subscription_level,
    "full",
  );
  TestValidator.equals(
    "feed weight maintained",
    enabledSubscription.feed_weight,
    1.0,
  );
  TestValidator.equals(
    "community name preserved",
    enabledSubscription.community_name,
    communityName,
  );
  TestValidator.equals(
    "community title preserved",
    enabledSubscription.community_title,
    community.title,
  );

  // 6. Disable notifications again
  const disabledSubscription: IRedditPlatformCommunitySubscription.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.subscriptions.index(
      connection,
      {
        communityName: communityName,
        body: {
          subscription_level: "full",
          notification_enabled: false,
          feed_weight: 1.0,
        } satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(disabledSubscription);
  TestValidator.equals(
    "notifications disabled successfully",
    disabledSubscription.notification_enabled,
    false,
  );

  // 7. Test different subscription levels
  const digestSubscription: IRedditPlatformCommunitySubscription.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.subscriptions.index(
      connection,
      {
        communityName: communityName,
        body: {
          subscription_level: "digest",
          notification_enabled: true,
          feed_weight: 0.5,
        } satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(digestSubscription);
  TestValidator.equals(
    "digest subscription level applied",
    digestSubscription.subscription_level,
    "digest",
  );
  TestValidator.equals(
    "digest feed weight applied",
    digestSubscription.feed_weight,
    0.5,
  );
  TestValidator.equals(
    "notifications enabled for digest",
    digestSubscription.notification_enabled,
    true,
  );

  // 8. Test muted subscription
  const mutedSubscription: IRedditPlatformCommunitySubscription.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.subscriptions.index(
      connection,
      {
        communityName: communityName,
        body: {
          subscription_level: "mute",
          notification_enabled: false,
          feed_weight: 0.1,
        } satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(mutedSubscription);
  TestValidator.equals(
    "muted subscription level applied",
    mutedSubscription.subscription_level,
    "mute",
  );
  TestValidator.equals(
    "muted notifications disabled",
    mutedSubscription.notification_enabled,
    false,
  );
  TestValidator.equals(
    "muted feed weight applied",
    mutedSubscription.feed_weight,
    0.1,
  );
}
