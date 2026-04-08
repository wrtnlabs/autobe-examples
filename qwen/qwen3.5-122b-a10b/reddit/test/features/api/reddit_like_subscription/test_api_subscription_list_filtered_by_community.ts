import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunitySubscription";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_subscriptions_create } from "../../../generate/generate_random_reddit_like_member_subscriptions_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_subscription";

/**
 * Test subscription list filtering by community ID.
 *
 * Validates that members can filter their subscription list by specifying a community_id parameter. The test creates multiple communities, subscribes to each, then queries with a filter to ensure only the matching subscription is returned with correct pagination metadata.
 *
 * 1. Member authenticates via join endpoint.
 * 2. Create first community with unique name.
 * 3. Create second community with unique name.
 * 4. Subscribe to first community.
 * 5. Subscribe to second community.
 * 6. Query subscriptions with community_id filter for first community.
 * 7. Validate response contains exactly 1 subscription matching the filtered community.
 * 8. Verify pagination metadata shows records count of 1.
 */
export async function test_api_subscription_list_filtered_by_community(
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
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create first community
  const community1 =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {
        body: {
          name: `community-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(community1);
  // 3. Create second community
  const community2 =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {
        body: {
          name: `community-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(community2);
  // 4. Subscribe to first community
  const subscription1 =
    await generate_random_reddit_like_member_subscriptions_create(
      memberConnection,
      {
        body: {
          communityId: community1.id,
        } satisfies IRedditLikeCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription1);
  // 5. Subscribe to second community
  const subscription2 =
    await generate_random_reddit_like_member_subscriptions_create(
      memberConnection,
      {
        body: {
          communityId: community2.id,
        } satisfies IRedditLikeCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription2);
  // 6. Query subscriptions with community_id filter
  const filteredSubscriptions =
    await api.functional.redditLike.member.subscriptions.index(
      memberConnection,
      {
        body: {
          community_id: community1.id,
        } satisfies IRedditLikeCommunitySubscription.IRequest,
      },
    );
  typia.assert(filteredSubscriptions);
  // 7. Validate response contains exactly 1 subscription
  TestValidator.equals(
    "subscription count",
    filteredSubscriptions.data.length,
    1,
  );
  TestValidator.equals(
    "filtered community id",
    filteredSubscriptions.data[0].community.id,
    community1.id,
  );
  // 8. Verify pagination metadata
  TestValidator.equals(
    "pagination records count",
    filteredSubscriptions.pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination pages",
    filteredSubscriptions.pagination.pages,
    1,
  );
}
