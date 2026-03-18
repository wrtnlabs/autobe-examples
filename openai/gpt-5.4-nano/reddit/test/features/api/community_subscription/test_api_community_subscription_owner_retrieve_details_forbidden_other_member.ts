import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_subscriptions_create } from "../../../generate/generate_random_community_platform_community_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";

export async function test_api_community_subscription_owner_retrieve_details_forbidden_other_member(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A setup
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAJoin = await authorize_member_join(memberAConnection, {});
  typia.assert(memberAJoin);
  const memberACommunity =
    await generate_random_community_platform_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(memberACommunity);
  const memberASubscription =
    await generate_random_community_platform_community_subscriptions_create(
      memberAConnection,
      {
        body: {
          community_id: memberACommunity.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(memberASubscription);

  // 2) Member B setup
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBJoin = await authorize_member_join(memberBConnection, {});
  typia.assert(memberBJoin);

  // 3) Forbidden access attempt: Member B retrieving Member A subscription
  await TestValidator.httpError(
    "forbidden when other member retrieves subscription details",
    403,
    async () => {
      await api.functional.communityPlatform.communitySubscriptions.at(
        memberBConnection,
        {
          communitySubscriptionId: memberASubscription.id,
        },
      );
    },
  );
}
