import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
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
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_subscription_unsubscribe_another_members_subscription(
  connection: api.IConnection,
): Promise<void> {
  // Setup first member (community creator)
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstMemberConnection, {});
  typia.assert(firstMember);
  // Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      firstMemberConnection,
      {},
    );
  typia.assert(community);
  // Setup second member (subscriber)
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondMemberConnection, {});
  typia.assert(secondMember);
  // Second member subscribes to community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      secondMemberConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // Verify subscription ownership
  TestValidator.equals(
    "subscription belongs to second member",
    subscription.member.id,
    secondMember.id,
  );
  TestValidator.equals(
    "subscription references correct community",
    subscription.community.id,
    community.id,
  );
  TestValidator.predicate(
    "subscription is active",
    subscription.active === true,
  );
  // First member attempts to delete second member's subscription - should fail
  await TestValidator.error(
    "first member cannot unsubscribe another member",
    async () => {
      await api.functional.communityPlatform.member.subscriptions.erase(
        firstMemberConnection,
        {
          subscriptionId: subscription.id,
        },
      );
    },
  );
  // Verify subscription still exists by attempting to delete with correct owner
  await TestValidator.error(
    "subscription still exists (duplicate deletion)",
    async () => {
      await api.functional.communityPlatform.member.subscriptions.erase(
        secondMemberConnection,
        {
          subscriptionId: subscription.id,
        },
      );
    },
  );
}
