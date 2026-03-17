import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunitySubscription";
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

export async function test_api_subscriptions_list_with_active_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and get an authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create two communities using the generation utility
  const community1 = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community1);
  const community2 = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community2);
  // 3. Subscribe the member to both communities
  const subscription1 =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      { communityId: community1.id },
    );
  typia.assert(subscription1);
  const subscription2 =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      { communityId: community2.id },
    );
  typia.assert(subscription2);
  // 4. Call the target endpoint with default request body (no filters, no pagination)
  const result = await api.functional.community.member.subscriptions.index(
    memberConnection,
    {
      body: {} satisfies ICommunitySubscription.IRequest,
    },
  );
  typia.assert(result);
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "pagination.records should be at least 2",
    result.pagination.records >= 2,
  );
  TestValidator.predicate(
    "data array should have at least 2 items",
    result.data.length >= 2,
  );
  // 6. Validate each item in data has correct shape (typia.assert already validated types)
  // Validate subscriberCount >= 1 for communities we subscribed to
  const subscribedCommunityIds = new Set([community1.id, community2.id]);
  for (const item of result.data) {
    if (subscribedCommunityIds.has(item.community.id)) {
      TestValidator.predicate(
        "subscriberCount should be at least 1 for subscribed community",
        item.community.subscriberCount >= 1,
      );
    }
  }
  // 7. Validate default sort order is created_at DESC
  // The second subscription (subscription2, community2) should appear before subscription1
  const community1Index = result.data.findIndex(
    (item) => item.community.id === community1.id,
  );
  const community2Index = result.data.findIndex(
    (item) => item.community.id === community2.id,
  );
  // Both subscribed communities should appear in the result
  TestValidator.predicate(
    "community1 should appear in the subscription list",
    community1Index !== -1,
  );
  TestValidator.predicate(
    "community2 should appear in the subscription list",
    community2Index !== -1,
  );
  // community2 was subscribed after community1, so in DESC order it should appear first
  TestValidator.predicate(
    "community2 (subscribed later) should appear before community1 in DESC order",
    community2Index < community1Index,
  );
}
