import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";

export async function test_api_subscription_cross_community_scoping_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create community A
  const communityA =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(communityA);
  // 3. Create community B
  const communityB =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(communityB);
  // 4. Subscribe to community A
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberConnection,
      {
        communityName: communityA.name,
      },
    );
  typia.assert(subscription);
  // 5. Attempt to retrieve the subscription via community B's namespace — expect 404
  await TestValidator.error(
    "cross-community scoping: subscription not found through different community namespace",
    async () => {
      await api.functional.communityHub.member.communities.subscriptions.at(
        memberConnection,
        {
          communityName: communityB.name,
          subscriptionId: subscription.id,
        },
      );
    },
  );
}
