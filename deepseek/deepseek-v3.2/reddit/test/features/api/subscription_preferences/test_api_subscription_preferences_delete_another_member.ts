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
 * Test that a member cannot delete another member's subscription preferences,
 * receiving a 403 Forbidden error.
 */
export async function test_api_subscription_preferences_delete_another_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A and set up their connection
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {});
  typia.assert(memberAAuthorized);
  // 2. Create a community as Member A
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe Member A to the community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberAConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create subscription preferences as Member A
  const preferences =
    await generate_random_community_platform_member_subscription_preferences_create(
      memberAConnection,
      {
        body: {
          communityPlatformSubscriptionId: subscription.id,
          notifyNewPosts: true,
          notifyNewComments: false,
          showInHomeFeed: true,
        } satisfies ICommunityPlatformSubscriptionPreference.ICreate,
      },
    );
  typia.assert(preferences);
  const preferenceId = preferences.id;
  // 5. Create Member B with separate connection (different member)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {});
  typia.assert(memberBAuthorized);
  // Validate that Member A and Member B are different users
  TestValidator.notEquals(
    "Member A and Member B must be different users",
    memberAAuthorized.id,
    memberBAuthorized.id,
  );
  // 6. Attempt unauthorized deletion - Member B tries to delete Member A's preferences
  await TestValidator.httpError(
    "Member B cannot delete Member A's subscription preferences",
    403,
    async () => {
      await api.functional.communityPlatform.member.subscription_preferences.erase(
        memberBConnection,
        {
          preferenceId,
        },
      );
    },
  );
  // 7. Verify preferences still exist by attempting to delete as Member A (should succeed)
  // This confirms the preferences weren't actually deleted
  await api.functional.communityPlatform.member.subscription_preferences.erase(
    memberAConnection,
    {
      preferenceId,
    },
  );
  // Void response - successful deletion confirms preferences existed
}
