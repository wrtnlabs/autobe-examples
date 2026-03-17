import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformSubscriptionPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionPreference";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_subscription_preferences_create } from "../../../generate/generate_random_community_platform_member_subscription_preferences_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";
import { prepare_random_community_platform_subscription_preference } from "../../../prepare/prepare_random_community_platform_subscription_preference";

export async function test_api_subscription_preferences_retrieve_owned_preference(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate first member
  const memberConnection1: api.IConnection = { host: connection.host };
  const memberAuth1 = await authorize_member_join(memberConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAuth1);
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection1,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection1,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create subscription preferences with custom settings
  const preferences =
    await generate_random_community_platform_member_subscription_preferences_create(
      memberConnection1,
      {
        body: {
          communityPlatformSubscriptionId: subscription.id,
          notifyNewPosts: false,
          notifyNewComments: true,
          notifyMentions: true,
          showInHomeFeed: true,
          highlightNewContent: true,
          autoExpandComments: false,
          sortPostsBy: "hot",
          sortCommentsBy: "best",
        } satisfies ICommunityPlatformSubscriptionPreference.ICreate,
      },
    );
  typia.assert(preferences);
  // 5. Retrieve the preferences (should succeed)
  const retrieved =
    await api.functional.communityPlatform.member.subscription_preferences.at(
      memberConnection1,
      {
        preferenceId: preferences.id,
      },
    );
  typia.assert(retrieved);
  // 6. Validate all fields match
  TestValidator.equals("preference ID matches", retrieved.id, preferences.id);
  TestValidator.equals(
    "notifyNewPosts matches",
    retrieved.notify_new_posts,
    false,
  );
  TestValidator.equals(
    "notifyNewComments matches",
    retrieved.notify_new_comments,
    true,
  );
  TestValidator.equals(
    "notifyMentions matches",
    retrieved.notify_mentions,
    true,
  );
  TestValidator.equals(
    "showInHomeFeed matches",
    retrieved.show_in_home_feed,
    true,
  );
  TestValidator.equals(
    "highlightNewContent matches",
    retrieved.highlight_new_content,
    true,
  );
  TestValidator.equals(
    "autoExpandComments matches",
    retrieved.auto_expand_comments,
    false,
  );
  TestValidator.equals("sortPostsBy matches", retrieved.sort_posts_by, "hot");
  TestValidator.equals(
    "sortCommentsBy matches",
    retrieved.sort_comments_by,
    "best",
  );
  // Validate subscription data is included
  typia.assert(retrieved.subscription);
  TestValidator.equals(
    "subscription ID matches",
    retrieved.subscription.id,
    subscription.id,
  );
  TestValidator.equals(
    "subscription active matches",
    retrieved.subscription.active,
    true,
  );
  // Validate community summary is included
  typia.assert(retrieved.subscription.community);
  TestValidator.equals(
    "community ID matches",
    retrieved.subscription.community.id,
    community.id,
  );
  // Validate timestamps
  TestValidator.predicate(
    "created_at is valid date",
    () => new Date(retrieved.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date",
    () => new Date(retrieved.updated_at).getTime() > 0,
  );
  // 7. Test authorization - second member cannot access first member's preferences
  const memberConnection2: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password456!",
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  await TestValidator.error(
    "second member cannot access first member's preferences",
    async () => {
      await api.functional.communityPlatform.member.subscription_preferences.at(
        memberConnection2,
        {
          preferenceId: preferences.id,
        },
      );
    },
  );
}
