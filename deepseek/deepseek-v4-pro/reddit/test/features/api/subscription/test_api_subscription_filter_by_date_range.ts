import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubCommunitySubscription";
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

export async function test_api_subscription_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create two communities
  const community1 =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community1);
  const community2 =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community2);
  // 3. Record timestamp before subscriptions
  const beforeAll = new Date().toISOString() satisfies string as string &
    tags.Format<"date-time">;
  // 4. Subscribe to both communities
  const sub1 =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberConnection,
      { communityName: community1.name },
    );
  typia.assert(sub1);
  const sub2 =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberConnection,
      { communityName: community2.name },
    );
  typia.assert(sub2);
  // 5. Record timestamp after subscriptions
  const afterAll = new Date().toISOString() satisfies string as string &
    tags.Format<"date-time">;
  // 6. Query with valid date range encompassing both subscriptions
  const validResult =
    await api.functional.communityHub.member.subscriptions.index(
      memberConnection,
      {
        body: {
          created_at_from: beforeAll,
          created_at_to: afterAll,
        } satisfies ICommunityHubCommunitySubscription.IRequest,
      },
    );
  typia.assert(validResult);
  TestValidator.predicate(
    "valid range returns at least two subscriptions",
    () => validResult.data.length >= 2,
  );
  TestValidator.predicate(
    "pagination records reflects filtered count",
    () => validResult.pagination.records >= 2,
  );
  // 7. Query with inverted date range (from later than to) — must return empty
  const invertedResult =
    await api.functional.communityHub.member.subscriptions.index(
      memberConnection,
      {
        body: {
          created_at_from: afterAll,
          created_at_to: beforeAll,
        } satisfies ICommunityHubCommunitySubscription.IRequest,
      },
    );
  typia.assert(invertedResult);
  TestValidator.equals(
    "inverted range returns empty data",
    invertedResult.data.length,
    0,
  );
  TestValidator.equals(
    "inverted range pagination records is zero",
    invertedResult.pagination.records,
    0,
  );
}
