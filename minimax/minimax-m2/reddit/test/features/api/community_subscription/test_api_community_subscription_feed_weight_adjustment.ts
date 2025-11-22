import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test community subscription feed weight adjustment functionality
 *
 * This test validates that users can adjust their community feed weight
 * preferences to control content prioritization in their personalized feeds.
 * The test covers the complete workflow from user registration through feed
 * weight modifications and subscription preference changes.
 *
 * Test Flow:
 *
 * 1. Register new user and establish authentication
 * 2. Create test community with appropriate settings
 * 3. Subscribe to community with various feed weight values (0.1-2.0)
 * 4. Test subscription level changes ('full', 'digest', 'mute')
 * 5. Validate notification preference toggles
 * 6. Verify response accuracy and type safety
 */
export async function test_api_community_subscription_feed_weight_adjustment(
  connection: api.IConnection,
) {
  // Step 1: Register new authenticated user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const userUsername = RandomGenerator.alphaNumeric(8);

  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: userUsername,
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Create test community
  const communityName = `testcommunity_${RandomGenerator.alphaNumeric(6)}`;
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: `Test Community ${communityName}`,
          description: "Community for testing feed weight adjustments",
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
    "community creation successful",
    community.name,
    communityName,
  );

  // Step 3: Test initial subscription with default feed weight
  const initialSubscription: IRedditPlatformCommunitySubscription.ISummary =
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
  typia.assert(initialSubscription);
  TestValidator.equals(
    "initial feed weight should be 1.0",
    initialSubscription.feed_weight,
    1.0,
  );
  TestValidator.equals(
    "initial subscription level should be full",
    initialSubscription.subscription_level,
    "full",
  );
  TestValidator.equals(
    "notifications should be enabled",
    initialSubscription.notification_enabled,
    true,
  );

  // Step 4: Test minimum feed weight (0.1)
  const minWeightSubscription: IRedditPlatformCommunitySubscription.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.subscriptions.index(
      connection,
      {
        communityName: communityName,
        body: {
          subscription_level: "digest",
          notification_enabled: false,
          feed_weight: 0.1,
        } satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(minWeightSubscription);
  TestValidator.equals(
    "min feed weight should be 0.1",
    minWeightSubscription.feed_weight,
    0.1,
  );
  TestValidator.equals(
    "subscription level should change to digest",
    minWeightSubscription.subscription_level,
    "digest",
  );
  TestValidator.equals(
    "notifications should be disabled",
    minWeightSubscription.notification_enabled,
    false,
  );

  // Step 5: Test maximum feed weight (2.0)
  const maxWeightSubscription: IRedditPlatformCommunitySubscription.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.subscriptions.index(
      connection,
      {
        communityName: communityName,
        body: {
          subscription_level: "full",
          notification_enabled: true,
          feed_weight: 2.0,
        } satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(maxWeightSubscription);
  TestValidator.equals(
    "max feed weight should be 2.0",
    maxWeightSubscription.feed_weight,
    2.0,
  );
  TestValidator.equals(
    "subscription level should change to full",
    maxWeightSubscription.subscription_level,
    "full",
  );
  TestValidator.equals(
    "notifications should be enabled",
    maxWeightSubscription.notification_enabled,
    true,
  );

  // Step 6: Test mid-range feed weight (1.5)
  const midWeightSubscription: IRedditPlatformCommunitySubscription.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.subscriptions.index(
      connection,
      {
        communityName: communityName,
        body: {
          subscription_level: "full",
          notification_enabled: true,
          feed_weight: 1.5,
        } satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(midWeightSubscription);
  TestValidator.equals(
    "mid feed weight should be 1.5",
    midWeightSubscription.feed_weight,
    1.5,
  );

  // Step 7: Test muted subscription level with low weight
  const mutedSubscription: IRedditPlatformCommunitySubscription.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.subscriptions.index(
      connection,
      {
        communityName: communityName,
        body: {
          subscription_level: "mute",
          notification_enabled: false,
          feed_weight: 0.2,
        } satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(mutedSubscription);
  TestValidator.equals(
    "muted subscription level should be mute",
    mutedSubscription.subscription_level,
    "mute",
  );
  TestValidator.equals(
    "muted feed weight should be 0.2",
    mutedSubscription.feed_weight,
    0.2,
  );
  TestValidator.equals(
    "muted notifications should be disabled",
    mutedSubscription.notification_enabled,
    false,
  );

  // Step 8: Verify community data integrity
  TestValidator.equals(
    "community name should match",
    mutedSubscription.community_name,
    communityName,
  );
  TestValidator.equals(
    "community title should match",
    mutedSubscription.community_title,
    community.title,
  );

  // Step 9: Test multiple weight increments
  const weightIncrements = [0.3, 0.5, 0.7, 0.9, 1.1, 1.3, 1.7, 1.9];
  for (const weight of weightIncrements) {
    const weightTestSubscription: IRedditPlatformCommunitySubscription.ISummary =
      await api.functional.redditPlatform.registeredUser.communities.subscriptions.index(
        connection,
        {
          communityName: communityName,
          body: {
            subscription_level: "full",
            notification_enabled: true,
            feed_weight: weight,
          } satisfies IRedditPlatformCommunitySubscription.IRequest,
        },
      );
    typia.assert(weightTestSubscription);
    TestValidator.equals(
      `feed weight should be ${weight}`,
      weightTestSubscription.feed_weight,
      weight,
    );
  }

  // Step 10: Final validation - restore to moderate settings
  const finalSubscription: IRedditPlatformCommunitySubscription.ISummary =
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
  typia.assert(finalSubscription);
  TestValidator.equals(
    "final feed weight should be 1.0",
    finalSubscription.feed_weight,
    1.0,
  );
  TestValidator.equals(
    "final subscription level should be full",
    finalSubscription.subscription_level,
    "full",
  );
  TestValidator.equals(
    "final notifications should be enabled",
    finalSubscription.notification_enabled,
    true,
  );
}
