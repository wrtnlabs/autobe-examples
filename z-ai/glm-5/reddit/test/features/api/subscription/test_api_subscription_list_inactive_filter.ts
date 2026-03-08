import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSubscription";
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

export async function test_api_subscription_list_inactive_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe the member to the community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(subscription);
  // 4. Unsubscribe (sets is_active = false)
  await api.functional.communityPlatform.member.subscriptions.erase(
    memberConnection,
    { subscriptionId: subscription.id },
  );
  // 5. Query inactive subscriptions
  const result =
    await api.functional.communityPlatform.member.subscriptions.index(
      memberConnection,
      { body: { isActive: false } },
    );
  typia.assert(result);
  // 6. Find the inactive subscription
  const inactiveSubscription = result.data.find(
    (s) => s.id === subscription.id,
  );
  const safeInactiveSubscription = typia.assert(inactiveSubscription!);
  // 7. Validate the subscription is inactive
  TestValidator.equals(
    "is_active should be false",
    safeInactiveSubscription.is_active,
    false,
  );
  // 8. Validate community details are preserved
  TestValidator.equals(
    "community id matches",
    safeInactiveSubscription.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    safeInactiveSubscription.community.name,
    community.name,
  );
  TestValidator.equals(
    "community description matches",
    safeInactiveSubscription.community.description,
    community.description,
  );
  TestValidator.equals(
    "community icon matches",
    safeInactiveSubscription.community.icon,
    community.icon,
  );
}