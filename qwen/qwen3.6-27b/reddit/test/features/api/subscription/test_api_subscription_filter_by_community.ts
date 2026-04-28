import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityCommunitySubscription";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";

/**
 * Test filtering community subscriptions by specific community ID.
 *
 * Validates that a member with multiple community subscriptions can filter their subscription list by a specific community ID, returning only the matching membership record. Ensures pagination metadata correctly reflects the filtered result count even when the member has subscriptions to multiple communities.
 *
 * 1. Authenticate a new member via join endpoint.
 * 2. Create two distinct communities.
 * 3. Subscribe the authenticated member to both communities.
 * 4. Query subscriptions with the member's userId and one community's communityId as filter.
 * 5. Verify response contains exactly one subscription matching the specified community.
 * 6. Confirm pagination records count reflects the filtered result of 1.
 */
export async function test_api_subscription_filter_by_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  TestValidator.predicate(
    "member is authenticated",
    member.token.access !== "",
  );
  // 2. Create two distinct communities
  const communityA =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(communityA);
  const communityB =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(communityB);
  TestValidator.notEquals(
    "communities are distinct",
    communityA.id,
    communityB.id,
  );
  // 3. Subscribe member to both communities
  const subscriptionA =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      {
        body: { community_id: communityA.id },
      },
    );
  typia.assert(subscriptionA);
  TestValidator.equals(
    "subscribed to community A",
    subscriptionA.community.id,
    communityA.id,
  );
  const subscriptionB =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      {
        body: { community_id: communityB.id },
      },
    );
  typia.assert(subscriptionB);
  TestValidator.equals(
    "subscribed to community B",
    subscriptionB.community.id,
    communityB.id,
  );
  // 4. Query subscriptions filtered by communityA's id
  const filteredPagination =
    await api.functional.redditLikeCommunity.member.users.subscriptions.index(
      memberConnection,
      {
        userId: member.id,
        body: {
          communityId: communityA.id,
        } satisfies IRedditLikeCommunityCommunitySubscription.IRequest,
      },
    );
  typia.assert(filteredPagination);
  // 5. Verify response contains exactly one subscription
  TestValidator.equals(
    "filtered pagination records is 1",
    filteredPagination.pagination.records,
    1,
  );
  TestValidator.equals(
    "filtered data length is 1",
    filteredPagination.data.length,
    1,
  );
  // 6. Verify community enrichment matches the filtered community
  TestValidator.equals(
    "returned subscription matches filtered community id",
    filteredPagination.data[0].community.id,
    communityA.id,
  );
  TestValidator.equals(
    "member id matches authenticated member",
    filteredPagination.data[0].member.id,
    member.id,
  );
}
