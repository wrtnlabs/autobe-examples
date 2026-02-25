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

export async function test_api_subscription_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and join
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create first community (auto-subscribed as creator)
  const community1 = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community1);
  // 3. Create second community to subscribe to
  const community2 = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community2);
  // Note: Member is auto-subscribed to communities they create
  // So member now has subscriptions to both community1 and community2
  // 4. Retrieve subscription list with default pagination (no parameters)
  const subscriptionList =
    await api.functional.community.member.subscriptions.index(
      memberConnection,
      {
        body: {} satisfies ICommunitySubscription.IRequest,
      },
    );
  typia.assert(subscriptionList);
  // 5. Validate pagination metadata - defaults should be page=1, limit=25
  TestValidator.equals(
    "default page is 1",
    subscriptionList.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit is 25",
    subscriptionList.pagination.limit,
    25,
  );
  TestValidator.predicate(
    "records >= 2",
    subscriptionList.pagination.records >= 2,
  );
  TestValidator.predicate("pages >= 1", subscriptionList.pagination.pages >= 1);
  // 6. Validate data count
  TestValidator.predicate(
    "data has subscriptions",
    subscriptionList.data.length >= 2,
  );
  // 7. Validate default sort order (by date, most recent first)
  if (subscriptionList.data.length >= 2) {
    const dates = subscriptionList.data.map((s) =>
      new Date(s.created_at).getTime(),
    );
    for (let i = 0; i < dates.length - 1; i++) {
      TestValidator.predicate(
        "subscriptions sorted by date descending",
        dates[i] >= dates[i + 1],
      );
    }
  }
}
