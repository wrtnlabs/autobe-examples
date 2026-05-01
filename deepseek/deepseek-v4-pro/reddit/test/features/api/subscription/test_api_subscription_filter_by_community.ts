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

/**
 * Test filtering subscription records by community_id.
 *
 * Validates that a member can filter their subscription records to show only those belonging to a specific community. The member authenticates, creates a new community, subscribes to it, then queries the subscription index with the community_id filter.
 *
 * 1. Member authenticates via join, obtaining an authorized connection.
 * 2. Member creates a new community, becoming its permanent owner.
 * 3. Member subscribes to the newly created community.
 * 4. Queries subscription index with community_id filter set to the created community's ID.
 * 5. Validates all returned subscriptions reference the filtered community.
 * 6. Validates pagination metadata reflects the filtered count, not platform-wide total.
 */
export async function test_api_subscription_filter_by_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Query subscriptions with community_id filter
  const result = await api.functional.communityHub.member.subscriptions.index(
    memberConnection,
    {
      body: {
        community_id: community.id,
      } satisfies ICommunityHubCommunitySubscription.IRequest,
    },
  );
  typia.assert(result);
  // 5. Validate filtered results
  TestValidator.predicate(
    "at least one subscription returned",
    result.data.length >= 1,
  );
  for (const sub of result.data) {
    TestValidator.equals(
      "subscription targets filtered community",
      sub.community.id,
      community.id,
    );
  }
  TestValidator.equals(
    "pagination records reflect filtered count",
    result.pagination.records,
    result.data.length,
  );
}
