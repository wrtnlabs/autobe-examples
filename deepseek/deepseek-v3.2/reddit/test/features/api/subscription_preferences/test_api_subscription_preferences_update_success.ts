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

export async function test_api_subscription_preferences_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
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
  // Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      { body: { name: RandomGenerator.alphaNumeric(8) } },
    );
  typia.assert(community);
  // Create subscription to community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(subscription);
  // Create initial subscription preferences with default values
  const initialPreferences =
    await generate_random_community_platform_member_subscription_preferences_create(
      memberConnection,
      { body: { communityPlatformSubscriptionId: subscription.id } },
    );
  typia.assert(initialPreferences);
  // Save initial timestamps for comparison
  const initialCreatedAt = initialPreferences.created_at;
  const initialUpdatedAt = initialPreferences.updated_at;
  // Update preferences with exactly the values from scenario plan
  const updateBody = {
    notify_new_posts: false,
    notify_new_comments: false,
    notify_mentions: true,
    show_in_home_feed: false,
    highlight_new_content: true,
    auto_expand_comments: true,
    sort_posts_by: "new",
    sort_comments_by: "best",
  } satisfies ICommunityPlatformSubscriptionPreference.IUpdate;
  const updatedPreferences =
    await api.functional.communityPlatform.member.subscription_preferences.update(
      memberConnection,
      {
        preferenceId: initialPreferences.id,
        body: updateBody,
      },
    );
  typia.assert(updatedPreferences);
  // Validate all updated fields match expected values
  TestValidator.equals(
    "notify_new_posts should be false",
    updatedPreferences.notify_new_posts,
    false,
  );
  TestValidator.equals(
    "notify_new_comments should be false",
    updatedPreferences.notify_new_comments,
    false,
  );
  TestValidator.equals(
    "notify_mentions should be true",
    updatedPreferences.notify_mentions,
    true,
  );
  TestValidator.equals(
    "show_in_home_feed should be false",
    updatedPreferences.show_in_home_feed,
    false,
  );
  TestValidator.equals(
    "highlight_new_content should be true",
    updatedPreferences.highlight_new_content,
    true,
  );
  TestValidator.equals(
    "auto_expand_comments should be true",
    updatedPreferences.auto_expand_comments,
    true,
  );
  TestValidator.equals(
    "sort_posts_by should be new",
    updatedPreferences.sort_posts_by,
    "new",
  );
  TestValidator.equals(
    "sort_comments_by should be best",
    updatedPreferences.sort_comments_by,
    "best",
  );
  // Verify subscription relationship unchanged
  TestValidator.equals(
    "subscription ID should match",
    updatedPreferences.subscription.id,
    subscription.id,
  );
  // Verify timestamps: created_at unchanged, updated_at changed
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedPreferences.created_at,
    initialCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at should be different after update",
    updatedPreferences.updated_at,
    initialUpdatedAt,
  );
}
