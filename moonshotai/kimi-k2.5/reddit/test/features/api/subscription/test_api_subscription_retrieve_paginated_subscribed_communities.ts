import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunitySubscription";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
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
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

export async function test_api_subscription_retrieve_paginated_subscribed_communities(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Step 2: Create a community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 1,
          wordMax: 3,
        }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // Step 3: Subscribe to the community
  const subscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // Step 4: Retrieve paginated subscribed communities
  const paginatedResult =
    await api.functional.redditLike.member.subscribed_communities.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "-created_at",
        } satisfies IRedditLikeCommunitySubscription.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // Step 5: Validate data contains the subscribed community
  const foundSubscription = paginatedResult.data.find(
    (item) => item.community.id === community.id,
  );
  TestValidator.predicate(
    "found subscription for created community",
    foundSubscription !== undefined,
  );
  if (foundSubscription) {
    TestValidator.equals(
      "subscription community id matches",
      foundSubscription.community.id,
      community.id,
    );
    TestValidator.equals(
      "subscription community name matches",
      foundSubscription.community.name,
      community.name,
    );
    TestValidator.equals(
      "subscription community description matches",
      foundSubscription.community.description,
      community.description,
    );
    TestValidator.predicate(
      "subscription timestamp is valid ISO datetime",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
        foundSubscription.createdAt,
      ),
    );
  }
  // Step 6: Verify sorting by created_at descending (newest first)
  const timestamps = paginatedResult.data.map((item) =>
    new Date(item.createdAt).getTime(),
  );
  for (let i = 1; i < timestamps.length; i++) {
    TestValidator.predicate(
      `sort order descending at position ${i}`,
      timestamps[i - 1] >= timestamps[i],
    );
  }
}
