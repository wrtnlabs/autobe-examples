import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscriptionJunction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscriptionJunction";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_subscription_feed_weight_optimization(
  connection: api.IConnection,
) {
  // Step 1: Create user account for feed weight testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: userEmail,
        password: "TestPassword123!",
        display_name: RandomGenerator.name(),
        href: "https://example.com/test",
        referrer: "https://example.com/referrer",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Create community for feed weight optimization testing
  const communityName = `testcommunity_${RandomGenerator.alphaNumeric(6)}`;
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: `Test Community ${RandomGenerator.paragraph({ sentences: 2 })}`,
          description: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
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

  // Step 3: Create subscription with standard feed weight
  const standardWeight = 1.0;
  const subscription: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        userId: user.id,
        body: {
          subscription_level: "full",
          notification_enabled: true,
          feed_weight: standardWeight,
        } satisfies IRedditPlatformCommunitySubscriptionJunction.ICreate,
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "initial feed weight should be standard",
    subscription.feed_weight,
    standardWeight,
  );

  // Step 4: Test feed weight increase (higher content visibility)
  const increasedWeight = 1.8;
  const updatedSubscriptionIncrease: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.registeredUser.communities.subscriptions.update(
      connection,
      {
        communityName: community.name,
        userId: user.id,
        body: {
          feed_weight: increasedWeight,
        } satisfies IRedditPlatformCommunitySubscriptionJunction.IUpdate,
      },
    );
  typia.assert(updatedSubscriptionIncrease);
  TestValidator.equals(
    "feed weight should increase for higher visibility",
    updatedSubscriptionIncrease.feed_weight,
    increasedWeight,
  );
  TestValidator.equals(
    "subscription level should remain full",
    updatedSubscriptionIncrease.subscription_level,
    "full",
  );
  TestValidator.equals(
    "notification should remain enabled",
    updatedSubscriptionIncrease.notification_enabled,
    true,
  );

  // Step 5: Test feed weight decrease (lower content visibility)
  const decreasedWeight = 0.3;
  const updatedSubscriptionDecrease: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.registeredUser.communities.subscriptions.update(
      connection,
      {
        communityName: community.name,
        userId: user.id,
        body: {
          feed_weight: decreasedWeight,
        } satisfies IRedditPlatformCommunitySubscriptionJunction.IUpdate,
      },
    );
  typia.assert(updatedSubscriptionDecrease);
  TestValidator.equals(
    "feed weight should decrease for lower visibility",
    updatedSubscriptionDecrease.feed_weight,
    decreasedWeight,
  );
  TestValidator.equals(
    "subscription level should remain full",
    updatedSubscriptionDecrease.subscription_level,
    "full",
  );
  TestValidator.equals(
    "notification should remain enabled",
    updatedSubscriptionDecrease.notification_enabled,
    true,
  );

  // Step 6: Test boundary values (minimum weight)
  const minimumWeight = 0.1;
  const updatedSubscriptionMin: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.registeredUser.communities.subscriptions.update(
      connection,
      {
        communityName: community.name,
        userId: user.id,
        body: {
          feed_weight: minimumWeight,
        } satisfies IRedditPlatformCommunitySubscriptionJunction.IUpdate,
      },
    );
  typia.assert(updatedSubscriptionMin);
  TestValidator.equals(
    "feed weight should accept minimum value",
    updatedSubscriptionMin.feed_weight,
    minimumWeight,
  );

  // Step 7: Test boundary values (maximum weight)
  const maximumWeight = 2.0;
  const updatedSubscriptionMax: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.registeredUser.communities.subscriptions.update(
      connection,
      {
        communityName: community.name,
        userId: user.id,
        body: {
          feed_weight: maximumWeight,
        } satisfies IRedditPlatformCommunitySubscriptionJunction.IUpdate,
      },
    );
  typia.assert(updatedSubscriptionMax);
  TestValidator.equals(
    "feed weight should accept maximum value",
    updatedSubscriptionMax.feed_weight,
    maximumWeight,
  );

  // Step 8: Test partial update (only feed weight changes)
  const middleWeight = 1.2;
  const updatedSubscriptionPartial: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.registeredUser.communities.subscriptions.update(
      connection,
      {
        communityName: community.name,
        userId: user.id,
        body: {
          feed_weight: middleWeight,
        } satisfies IRedditPlatformCommunitySubscriptionJunction.IUpdate,
      },
    );
  typia.assert(updatedSubscriptionPartial);
  TestValidator.equals(
    "partial update should only change feed weight",
    updatedSubscriptionPartial.feed_weight,
    middleWeight,
  );
  TestValidator.equals(
    "other subscription properties should remain unchanged",
    updatedSubscriptionPartial.subscription_level,
    "full",
  );
  TestValidator.equals(
    "notification setting should remain unchanged",
    updatedSubscriptionPartial.notification_enabled,
    true,
  );

  // Step 9: Test that subscription relationship is maintained
  TestValidator.equals(
    "community ID should remain consistent",
    updatedSubscriptionPartial.reddit_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "user ID should remain consistent",
    updatedSubscriptionPartial.registered_user_id,
    user.id,
  );

  // Step 10: Validate timestamps are updated appropriately
  TestValidator.predicate(
    "subscription should have subscribed timestamp",
    updatedSubscriptionPartial.subscribed_at !== undefined &&
      updatedSubscriptionPartial.subscribed_at !== null,
  );
  TestValidator.predicate(
    "subscription should have activity tracking",
    updatedSubscriptionPartial.last_activity_at !== undefined &&
      updatedSubscriptionPartial.last_activity_at !== null,
  );

  // Step 11: Test multiple weight adjustments in sequence
  const weightSequence = [0.5, 1.5, 0.2, 1.9, 1.0];
  for (const weight of weightSequence) {
    const weightUpdate: IRedditPlatformCommunitySubscriptionJunction =
      await api.functional.redditPlatform.registeredUser.communities.subscriptions.update(
        connection,
        {
          communityName: community.name,
          userId: user.id,
          body: {
            feed_weight: weight,
          } satisfies IRedditPlatformCommunitySubscriptionJunction.IUpdate,
        },
      );
    typia.assert(weightUpdate);
    TestValidator.equals(
      `feed weight should be ${weight} in sequence`,
      weightUpdate.feed_weight,
      weight,
    );
  }

  // Step 12: Final validation - ensure feed optimization works correctly
  const finalSubscription: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.registeredUser.communities.subscriptions.update(
      connection,
      {
        communityName: community.name,
        userId: user.id,
        body: {
          feed_weight: 1.0,
        } satisfies IRedditPlatformCommunitySubscriptionJunction.IUpdate,
      },
    );
  typia.assert(finalSubscription);
  TestValidator.equals(
    "final subscription should reset to standard weight",
    finalSubscription.feed_weight,
    1.0,
  );
  TestValidator.predicate(
    "feed optimization test completed successfully",
    finalSubscription.feed_weight === 1.0 &&
      finalSubscription.subscription_level === "full" &&
      finalSubscription.notification_enabled === true,
  );
}
