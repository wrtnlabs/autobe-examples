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
 * Test creating subscription preferences with minimal required data only.
 * Authenticate as a new member, create a community, subscribe to it,
 * then create subscription preferences providing only the required subscription_id field.
 * Validate that the system applies all default values correctly:
 * notify_new_posts=true, notify_new_comments=true, notify_mentions=true,
 * show_in_home_feed=true, highlight_new_content=false, auto_expand_comments=false,
 * sort_posts_by=null, sort_comments_by=null.
 * Verify that the preference record is created successfully and includes proper timestamps.
 * This tests the default value behavior and ensures the API accepts minimal input.
 */
export async function test_api_subscription_preferences_minimal_input_defaults(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for member
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Register and authenticate as member (using utility function)
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // Update connection headers with authorization token
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: `Bearer ${memberAuth.token.access}`,
  };
  // 2. Create a community (using utility function)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create subscription to the community (using utility function)
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create subscription preferences with minimal required data
  const preference =
    await generate_random_community_platform_member_subscription_preferences_create(
      memberConnection,
      {
        body: {
          communityPlatformSubscriptionId: subscription.id,
        } satisfies ICommunityPlatformSubscriptionPreference.ICreate,
      },
    );
  typia.assert(preference);
  // 5. Validate default values are applied
  TestValidator.equals(
    "notify_new_posts defaults to true",
    preference.notify_new_posts,
    true,
  );
  TestValidator.equals(
    "notify_new_comments defaults to true",
    preference.notify_new_comments,
    true,
  );
  TestValidator.equals(
    "notify_mentions defaults to true",
    preference.notify_mentions,
    true,
  );
  TestValidator.equals(
    "show_in_home_feed defaults to true",
    preference.show_in_home_feed,
    true,
  );
  TestValidator.equals(
    "highlight_new_content defaults to false",
    preference.highlight_new_content,
    false,
  );
  TestValidator.equals(
    "auto_expand_comments defaults to false",
    preference.auto_expand_comments,
    false,
  );
  TestValidator.equals(
    "sort_posts_by defaults to null",
    preference.sort_posts_by,
    null,
  );
  TestValidator.equals(
    "sort_comments_by defaults to null",
    preference.sort_comments_by,
    null,
  );
  // 6. Validate subscription relationship
  TestValidator.equals(
    "subscription ID matches",
    preference.subscription.id,
    subscription.id,
  );
}
