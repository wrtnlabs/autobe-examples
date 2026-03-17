import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
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

export async function test_api_community_subscription_list_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for member
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate as member
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create first community
  const community1 =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community1);
  // 3. Create second community
  const community2 =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community2);
  // 4. Subscribe to first community
  const subscription1 =
    await api.functional.redditLike.member.communities.subscriptions.create(
      memberConnection,
      { communityId: community1.id },
    );
  typia.assert(subscription1);
  // 5. Subscribe to second community
  const subscription2 =
    await api.functional.redditLike.member.communities.subscriptions.create(
      memberConnection,
      { communityId: community2.id },
    );
  typia.assert(subscription2);
  // 6. Retrieve subscribed communities list with pagination
  const response = await api.functional.redditLike.member.subscriptions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IRedditLikeCommunitySubscription.IRequest,
    },
  );
  typia.assert(response);
  // 7. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination has records",
    response.pagination.records >= 2,
  );
  TestValidator.predicate(
    "pagination has pages",
    response.pagination.pages >= 1,
  );
  // 8. Validate both communities appear in subscription list
  const foundCommunity1 = response.data.find((c) => c.id === community1.id);
  const foundCommunity2 = response.data.find((c) => c.id === community2.id);
  TestValidator.predicate(
    "community 1 in subscription list",
    foundCommunity1 !== undefined,
  );
  TestValidator.predicate(
    "community 2 in subscription list",
    foundCommunity2 !== undefined,
  );
  // 9. Validate community details match
  if (foundCommunity1) {
    TestValidator.equals(
      "community1 name",
      foundCommunity1.name,
      community1.name,
    );
    TestValidator.equals(
      "community1 owner",
      foundCommunity1.owner.id,
      community1.owner.id,
    );
    TestValidator.predicate(
      "community1 has subscribers",
      foundCommunity1.subscriberCount >= 1,
    );
  }
  if (foundCommunity2) {
    TestValidator.equals(
      "community2 name",
      foundCommunity2.name,
      community2.name,
    );
    TestValidator.equals(
      "community2 owner",
      foundCommunity2.owner.id,
      community2.owner.id,
    );
    TestValidator.predicate(
      "community2 has subscribers",
      foundCommunity2.subscriberCount >= 1,
    );
  }
}
