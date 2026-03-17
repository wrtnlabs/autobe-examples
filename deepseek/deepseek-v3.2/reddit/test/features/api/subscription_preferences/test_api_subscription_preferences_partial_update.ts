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

/**
 * Test that a member can perform partial updates to subscription preferences (only updating selected fields).
 *
 * Steps:
 * 1. Create member-specific connection using authorize_member_join
 * 2. Create a community
 * 3. Subscribe to the community
 * 4. Create initial subscription preferences with defaults
 * 5. Perform partial update with only notify_mentions and highlight_new_content fields
 * 6. Validate that only specified fields are updated, others retain previous values
 */
export async function test_api_subscription_preferences_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community
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
  // 4. Create initial subscription preferences
  const initialPreferences =
    await generate_random_community_platform_member_subscription_preferences_create(
      memberConnection,
      {
        body: {
          communityPlatformSubscriptionId: subscription.id,
          notifyNewPosts: true,
          notifyNewComments: true,
          notifyMentions: true,
          showInHomeFeed: true,
          highlightNewContent: false,
          autoExpandComments: false,
          sortPostsBy: null,
          sortCommentsBy: null,
        } satisfies ICommunityPlatformSubscriptionPreference.ICreate,
      },
    );
  typia.assert(initialPreferences);
  // 5. Perform partial update
  const updateBody = {
    notify_mentions: false,
    highlight_new_content: true,
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
  // 6. Validate partial update behavior
  // 6.1. Verify specified fields were updated
  TestValidator.equals(
    "notify_mentions should be updated to false",
    updatedPreferences.notify_mentions,
    false,
  );
  TestValidator.equals(
    "highlight_new_content should be updated to true",
    updatedPreferences.highlight_new_content,
    true,
  );
  // 6.2. Verify unspecified fields retained previous values
  TestValidator.equals(
    "notify_new_posts should remain unchanged",
    updatedPreferences.notify_new_posts,
    initialPreferences.notify_new_posts,
  );
  TestValidator.equals(
    "notify_new_comments should remain unchanged",
    updatedPreferences.notify_new_comments,
    initialPreferences.notify_new_comments,
  );
  TestValidator.equals(
    "show_in_home_feed should remain unchanged",
    updatedPreferences.show_in_home_feed,
    initialPreferences.show_in_home_feed,
  );
  TestValidator.equals(
    "auto_expand_comments should remain unchanged",
    updatedPreferences.auto_expand_comments,
    initialPreferences.auto_expand_comments,
  );
  // 6.3. Verify nullable sorting fields remained null when not specified
  TestValidator.equals(
    "sort_posts_by should remain null",
    updatedPreferences.sort_posts_by,
    null,
  );
  TestValidator.equals(
    "sort_comments_by should remain null",
    updatedPreferences.sort_comments_by,
    null,
  );
  // 6.4. Verify boolean fields not included remained unchanged
  TestValidator.predicate(
    "all unspecified boolean fields should match initial values",
    updatedPreferences.notify_new_posts ===
      initialPreferences.notify_new_posts &&
      updatedPreferences.notify_new_comments ===
        initialPreferences.notify_new_comments &&
      updatedPreferences.show_in_home_feed ===
        initialPreferences.show_in_home_feed &&
      updatedPreferences.auto_expand_comments ===
        initialPreferences.auto_expand_comments,
  );
}
