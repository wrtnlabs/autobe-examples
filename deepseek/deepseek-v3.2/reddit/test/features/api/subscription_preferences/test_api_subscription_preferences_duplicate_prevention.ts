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

export async function test_api_subscription_preferences_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create subscription
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // Create initial subscription preferences
  const preference =
    await generate_random_community_platform_member_subscription_preferences_create(
      memberConnection,
      {
        body: {
          communityPlatformSubscriptionId: subscription.id,
          notifyNewPosts: true,
          notifyNewComments: false,
          notifyMentions: true,
          showInHomeFeed: true,
          highlightNewContent: false,
          autoExpandComments: true,
          sortPostsBy: "hot",
          sortCommentsBy: "best",
        } satisfies ICommunityPlatformSubscriptionPreference.ICreate,
      },
    );
  typia.assert(preference);
  // Attempt to create duplicate preference
  await TestValidator.error(
    "duplicate subscription preferences should return conflict error",
    async () => {
      await generate_random_community_platform_member_subscription_preferences_create(
        memberConnection,
        {
          body: {
            communityPlatformSubscriptionId: subscription.id,
            notifyNewPosts: false,
            notifyNewComments: true,
            notifyMentions: false,
            showInHomeFeed: false,
            highlightNewContent: true,
            autoExpandComments: false,
            sortPostsBy: "new",
            sortCommentsBy: "controversial",
          } satisfies ICommunityPlatformSubscriptionPreference.ICreate,
        },
      );
    },
  );
  // Verify first preference remains unchanged
  TestValidator.equals(
    "first preference notifyNewPosts should remain true",
    preference.notify_new_posts,
    true,
  );
  TestValidator.equals(
    "first preference notifyNewComments should remain false",
    preference.notify_new_comments,
    false,
  );
  TestValidator.equals(
    "first preference notifyMentions should remain true",
    preference.notify_mentions,
    true,
  );
  TestValidator.equals(
    "first preference showInHomeFeed should remain true",
    preference.show_in_home_feed,
    true,
  );
  TestValidator.equals(
    "first preference highlightNewContent should remain false",
    preference.highlight_new_content,
    false,
  );
  TestValidator.equals(
    "first preference autoExpandComments should remain true",
    preference.auto_expand_comments,
    true,
  );
  TestValidator.equals(
    "first preference sortPostsBy should remain 'hot'",
    preference.sort_posts_by,
    "hot",
  );
  TestValidator.equals(
    "first preference sortCommentsBy should remain 'best'",
    preference.sort_comments_by,
    "best",
  );
}
