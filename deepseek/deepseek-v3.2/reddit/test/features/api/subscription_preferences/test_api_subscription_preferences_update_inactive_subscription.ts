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

export async function test_api_subscription_preferences_update_inactive_subscription(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection and register member
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
  // 2. Create community for the member to subscribe to
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community with INACTIVE subscription
  // According to ICommunityPlatformSubscription.ICreate, active defaults to true but can be set to false
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          active: false, // Create as inactive to test preference update for inactive subscription
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  TestValidator.equals("subscription inactive", subscription.active, false);
  // 4. Create initial subscription preferences for INACTIVE subscription
  const sortOptions = ["hot", "new", "top", "controversial"] as const;
  const initialSort = RandomGenerator.pick(sortOptions);
  const initialPreferences =
    await generate_random_community_platform_member_subscription_preferences_create(
      memberConnection,
      {
        body: {
          communityPlatformSubscriptionId: subscription.id,
          notifyNewPosts: true,
          showInHomeFeed: true,
          sortPostsBy: initialSort satisfies string | null as string | null,
        } satisfies ICommunityPlatformSubscriptionPreference.ICreate,
      },
    );
  typia.assert(initialPreferences);
  TestValidator.equals(
    "initial notify_new_posts",
    initialPreferences.notify_new_posts,
    true,
  );
  TestValidator.equals(
    "initial show_in_home_feed",
    initialPreferences.show_in_home_feed,
    true,
  );
  TestValidator.equals(
    "initial sort_posts_by",
    initialPreferences.sort_posts_by,
    initialSort,
  );
  // 5. Update subscription preferences for INACTIVE subscription
  const updatedSort = RandomGenerator.pick(
    sortOptions.filter((s) => s !== initialSort),
  );
  const updateBody = {
    notify_new_posts: false,
    show_in_home_feed: false,
    sort_posts_by: updatedSort satisfies string | null as string | null,
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
  // 6. Validate the updated preferences
  TestValidator.equals(
    "updated notify_new_posts",
    updatedPreferences.notify_new_posts,
    false,
  );
  TestValidator.equals(
    "updated show_in_home_feed",
    updatedPreferences.show_in_home_feed,
    false,
  );
  TestValidator.equals(
    "updated sort_posts_by",
    updatedPreferences.sort_posts_by,
    updatedSort,
  );
  TestValidator.equals(
    "preference ID unchanged",
    updatedPreferences.id,
    initialPreferences.id,
  );
  TestValidator.equals(
    "subscription reference unchanged",
    updatedPreferences.subscription.id,
    subscription.id,
  );
  TestValidator.equals(
    "subscription still inactive",
    updatedPreferences.subscription.active,
    false,
  );
  // 7. Test ownership validation (another member cannot update)
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMember = await authorize_member_join(otherMemberConnection, {
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
  typia.assert(otherMember);
  await TestValidator.error(
    "other member cannot update preferences",
    async () => {
      await api.functional.communityPlatform.member.subscription_preferences.update(
        otherMemberConnection,
        {
          preferenceId: initialPreferences.id,
          body: {
            notify_new_posts: true,
          } satisfies ICommunityPlatformSubscriptionPreference.IUpdate,
        },
      );
    },
  );
}
