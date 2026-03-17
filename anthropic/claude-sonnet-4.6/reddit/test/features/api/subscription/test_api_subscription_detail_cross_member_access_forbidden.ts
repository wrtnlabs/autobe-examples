import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_subscription_detail_cross_member_access_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A: Community creator
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 2. As Member A, create a community
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // 3. Member B: The subscriber
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 4. As Member B, subscribe to the community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberBConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 5. Member C: The unauthorized accessor
  const memberCConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberCConnection, {});
  // 6. As Member C, attempt to access Member B's subscription — must get 403
  await TestValidator.httpError(
    "cross-member subscription access must be forbidden",
    403,
    async () => {
      await api.functional.community.member.subscriptions.at(
        memberCConnection,
        {
          subscriptionId: subscription.id,
        },
      );
    },
  );
}
